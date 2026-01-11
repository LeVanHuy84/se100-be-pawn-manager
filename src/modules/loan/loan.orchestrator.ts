import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import {
  AuditEntityType,
  CollateralStatus,
  LoanStatus,
  RepaymentMethod,
} from 'generated/prisma';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import { LoanSimulationsService } from '../loan-simulations/loan-simulations.service';
import { LoanSimulationRequestDto } from '../loan-simulations/dto/request/loan-simulation.request';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { LoanStatusMachine } from './enum/loan.status-machine';
import {
  CreateLoanResponseDto,
  UpdateLoanResponseDto,
  UpdateLoanStatusResponseDto,
} from './dto/response/loan.response';
import { LoanMapper } from './loan.mapper';
import { AuditActionEnum } from 'src/common/enums/audit-action.enum';

@Injectable()
export class LoanOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loanSimulationsService: LoanSimulationsService,
  ) {}

  async createLoan(
    dto: CreateLoanDto,
    employee: any,
  ): Promise<CreateLoanResponseDto> {
    try {
      const {
        customerId,
        loanTypeId,
        loanAmount,
        repaymentMethod,
        notes,
        collateralIds,
      } = dto;

      // Kiểm tra customer, store tồn tại
      const [customer, store] = await Promise.all([
        this.prisma.customer.findUnique({ where: { id: customerId } }),
        this.prisma.store.findUnique({ where: { id: employee.storeId } }),
      ]);

      if (!customer) {
        throw new NotFoundException('Customer not found');
      } else if (!store) {
        throw new NotFoundException('Store not found');
      }

      // ================== Lấy thông tin tài sản =================
      const collaterals = await this.prisma.collateral.findMany({
        where: { id: { in: collateralIds } },
        include: { collateralType: true },
      });
      if (collaterals.length !== collateralIds.length) {
        throw new NotFoundException('One or more collaterals not found');
      }

      const totalCustodyFeeRate = collaterals.reduce((sum, c) => {
        return sum + c.collateralType.custodyFeeRateMonthly.toNumber();
      }, 0);

      // =============== 1. Lấy thông tin phí từ parameter ===============

      const latePaymentPenaltyRate =
        await this.prisma.systemParameter.findFirst({
          where: {
            paramGroup: 'RATES',
            paramKey: 'PENALTY_INTEREST_RATE',
            isActive: true,
          },
        });

      if (!latePaymentPenaltyRate) {
        throw new NotFoundException(
          'Late payment penalty rate parameter not found',
        );
      }

      // =============== 2. Lấy phí ===============
      const simulationRequest: LoanSimulationRequestDto = {
        loanAmount,
        loanTypeId,
        totalCustodyFeeRate,
        repaymentMethod: repaymentMethod as RepaymentMethod,
      };

      const simulationResult =
        await this.loanSimulationsService.createSimulation(simulationRequest);

      // =============== 3. Tạo loan + collateral trong transaction ===============
      return this.prisma.$transaction(async (tx) => {
        const loan = await tx.loan.create({
          data: {
            customerId,
            loanAmount,
            repaymentMethod: repaymentMethod as RepaymentMethod,
            loanTypeId,
            createdBy: employee.id,
            storeId: employee.storeId,

            // snapshot
            durationMonths: simulationResult.durationMonths,
            appliedInterestRate: simulationResult.appliedInterestRate,

            latePaymentPenaltyRate: latePaymentPenaltyRate.paramValue,
            totalInterest: simulationResult.totalInterest,
            totalFees: simulationResult.totalFees,
            totalRepayment: simulationResult.totalRepayment,
            monthlyPayment: simulationResult.monthlyPayment,

            remainingAmount: simulationResult.totalRepayment,
            status: LoanStatus.PENDING,
            notes,
          },
        });

        // Cập nhật loanId cho collaterals
        for (const collateral of collaterals) {
          await tx.collateral.update({
            where: { id: collateral.id },
            data: { loanId: loan.id },
          });
        }

        // Lưu lịch trả nợ
        for (const item of simulationResult.schedule) {
          await tx.repaymentScheduleDetail.create({
            data: {
              loanId: loan.id,
              periodNumber: item.periodNumber,
              dueDate: new Date(item.dueDate),
              beginningBalance: item.beginningBalance,
              principalAmount: item.principalAmount,
              interestAmount: item.interestAmount,
              feeAmount: item.feeAmount,
              totalAmount: item.totalAmount,
            },
          });
        }

        // Thêm audit log ở đây
        await tx.auditLog.create({
          data: {
            action: AuditActionEnum.CREATE_LOAN,
            entityId: loan.id,
            entityType: AuditEntityType.LOAN,
            actorId: employee.id,
            actorName: employee.name,
            newValue: {
              loanAmount: loan.loanAmount,
              durationMonths: loan.durationMonths,
              appliedInterestRate: loan.appliedInterestRate,
              repaymentMethod: loan.repaymentMethod,
              loanTypeId: loan.loanTypeId,
              customerId: loan.customerId,
            },
            description: `Created loan for customer ${loan.customerId}`,
          },
        });

        const fullLoan = await tx.loan.findUnique({
          where: { id: loan.id },
          include: {
            loanType: true,
            collaterals: {
              include: {
                collateralType: true,
                store: true,
              },
            },
          },
        });

        return {
          loan: LoanMapper.toLoanResponse(fullLoan),
          message:
            'Loan application created successfully. Status: PENDING. Awaiting approval.',
        };
      });
    } catch (error) {
      throw new BadRequestException(
        'Failed to create loan application: ' + error.message,
      );
    }
  }

  // ---------------------------------------------------------------
  // UPDATE LOAN nếu còn PENDING
  // ---------------------------------------------------------------
  async updateLoan(
    loanId: string,
    dto: UpdateLoanDto,
    employee: any,
  ): Promise<UpdateLoanResponseDto> {
    try {
      const loan = await this.prisma.loan.findUnique({
        where: { id: loanId },
      });

      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== LoanStatus.PENDING) {
        throw new BadRequestException(
          'Only loans with PENDING status can be updated',
        );
      }

      const beforeUpdate = {
        loanAmount: loan.loanAmount,
        repaymentMethod: loan.repaymentMethod,
        loanTypeId: loan.loanTypeId,
        durationMonths: loan.durationMonths,
        appliedInterestRate: loan.appliedInterestRate,
        latePaymentPenaltyRate: loan.latePaymentPenaltyRate,
        totalInterest: loan.totalInterest,
        totalFees: loan.totalFees,
        totalRepayment: loan.totalRepayment,
        monthlyPayment: loan.monthlyPayment,
      };

      await this.validateUpdatePendingLoan(loan, dto);

      // kiểm tra colleteral có thay đổi không
      const finalCollateralIds =
        dto.collateralIds ??
        (
          await this.prisma.collateral.findMany({
            where: { loanId: loan.id },
            select: { id: true },
          })
        ).map((c) => c.id);

      const collaterals = await this.prisma.collateral.findMany({
        where: { id: { in: finalCollateralIds } },
        include: { collateralType: true },
      });

      const totalCustodyFeeRate = collaterals.reduce(
        (sum, c) => sum + c.collateralType.custodyFeeRateMonthly.toNumber(),
        0,
      );

      const simulationRequest: LoanSimulationRequestDto = {
        loanAmount: dto.loanAmount ?? loan.loanAmount.toNumber(),
        loanTypeId: dto.loanTypeId ?? loan.loanTypeId,
        totalCustodyFeeRate,
        repaymentMethod:
          (dto.repaymentMethod as RepaymentMethod) ?? loan.repaymentMethod,
      };

      const simulationResult =
        await this.loanSimulationsService.createSimulation(simulationRequest);

      return this.prisma.$transaction(async (tx) => {
        const updatedLoan = await tx.loan.update({
          where: { id: loanId },
          data: {
            loanAmount: dto.loanAmount ?? loan.loanAmount,
            notes: dto.notes ?? loan.notes,
            repaymentMethod:
              (dto.repaymentMethod as RepaymentMethod) ?? loan.repaymentMethod,
            loanTypeId: dto.loanTypeId ?? loan.loanTypeId,
            // snapshot
            durationMonths: simulationResult.durationMonths,
            appliedInterestRate: simulationResult.appliedInterestRate,
            totalInterest: simulationResult.totalInterest,
            totalFees: simulationResult.totalFees,
            totalRepayment: simulationResult.totalRepayment,
            monthlyPayment: simulationResult.monthlyPayment,
            remainingAmount: simulationResult.totalRepayment,
          },
        });

        // Nếu client không gửi collateralIds → không update collateral
        if (!dto.collateralIds) {
          const fullLoan = await tx.loan.findUnique({
            where: { id: loan.id },
            include: {
              loanType: true,
              collaterals: {
                include: {
                  collateralType: true,
                },
              },
            },
          });
          return {
            message: 'Loan updated successfully (PENDING stage)',
            loan: LoanMapper.toLoanResponse(fullLoan),
          };
        }

        // ================= COLLATERAL DIFF =================
        if (dto.collateralIds) {
          const existingCollaterals = await tx.collateral.findMany({
            where: { loanId },
          });

          const existingIds = existingCollaterals.map((c) => c.id);

          const toAdd = finalCollateralIds.filter(
            (id) => !existingIds.includes(id),
          );

          const toRemove = existingCollaterals.filter(
            (c) => !finalCollateralIds.includes(c.id),
          );

          // ❌ Không cho remove nếu status ≠ PROPOSED
          const invalidRemove = toRemove.filter(
            (c) => c.status !== CollateralStatus.PROPOSED,
          );

          if (invalidRemove.length > 0) {
            throw new BadRequestException(
              'Some collaterals cannot be removed because they are no longer PROPOSED',
            );
          }

          // Add new collaterals
          await tx.collateral.updateMany({
            where: { id: { in: toAdd } },
            data: { loanId },
          });

          // Remove PROPOSED collaterals
          await tx.collateral.updateMany({
            where: { id: { in: toRemove.map((c) => c.id) } },
            data: {
              loanId: null,
              status: CollateralStatus.PROPOSED,
            },
          });
        }

        // Cập nhật lịch trả nợ mới
        await tx.repaymentScheduleDetail.deleteMany({ where: { loanId } });

        for (const item of simulationResult.schedule) {
          await tx.repaymentScheduleDetail.create({
            data: {
              loanId: loan.id,
              periodNumber: item.periodNumber,
              dueDate: new Date(item.dueDate),
              beginningBalance: item.beginningBalance,
              principalAmount: item.principalAmount,
              interestAmount: item.interestAmount,
              feeAmount: item.feeAmount,
              totalAmount: item.totalAmount,
            },
          });
        }

        // Lưu audit log
        const afterUpdate = {
          loanAmount: updatedLoan.loanAmount,
          repaymentMethod: updatedLoan.repaymentMethod,
          loanTypeId: updatedLoan.loanTypeId,
          durationMonths: updatedLoan.durationMonths,
          appliedInterestRate: updatedLoan.appliedInterestRate,
          latePaymentPenaltyRate: updatedLoan.latePaymentPenaltyRate,
          totalInterest: updatedLoan.totalInterest,
          totalFees: updatedLoan.totalFees,
          totalRepayment: updatedLoan.totalRepayment,
          monthlyPayment: updatedLoan.monthlyPayment,
        };

        const { oldValue, newValue } = this.diffObject(
          beforeUpdate,
          afterUpdate,
        );

        // Chỉ log khi có thay đổi thực sự
        if (Object.keys(newValue).length > 0) {
          await tx.auditLog.create({
            data: {
              action: AuditActionEnum.UPDATE_LOAN,
              entityId: loan.id,
              entityType: AuditEntityType.LOAN,
              actorId: employee.id,
              actorName: employee.name,
              oldValue,
              newValue,
              description: `Updated loan ${loan.id} (PENDING)`,
            },
          });
        }
        const fullLoan = await tx.loan.findUnique({
          where: { id: loan.id },
          include: {
            loanType: true,
            collaterals: {
              include: {
                collateralType: true,
                store: true,
              },
            },
          },
        });

        return {
          message: 'Loan updated successfully (PENDING stage)',
          loan: LoanMapper.toLoanResponse(fullLoan),
        };
      });
    } catch (error) {
      console.error('CREATE LOAN ERROR:', error);
      throw new BadRequestException('Failed to update loan: ' + error.message);
    }
  }

  // ---------------------------------------------------------------
  // UPDATE STATUS (giữ nguyên)
  // ---------------------------------------------------------------
  async updateStatus(
    loanId: string,
    dto: ApproveLoanDto,
    employee: any,
  ): Promise<UpdateLoanStatusResponseDto> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { collaterals: true },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    switch (dto.status) {
      case 'ACTIVE':
        if (!LoanStatusMachine.canTransition(loan.status, LoanStatus.ACTIVE)) {
          throw new BadRequestException('Invalid status transition');
        }
        return this.approveLoan(loan, dto, employee);
      case 'REJECTED':
        if (
          !LoanStatusMachine.canTransition(loan.status, LoanStatus.REJECTED)
        ) {
          throw new BadRequestException('Invalid status transition');
        }
        return this.rejectLoan(loan, dto, employee);
      default:
        throw new BadRequestException('Invalid status update request');
    }
  }

  private async approveLoan(
    loan: any,
    dto: ApproveLoanDto,
    employee: any,
  ): Promise<UpdateLoanStatusResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.ACTIVE,
          approvedAt: new Date(),
          approvedBy: employee.id,
          notes: dto.note
            ? loan.notes + '\n- Approval Note: ' + dto.note
            : loan.notes,
        },
      });

      // CollateralService mới không có onLoanApproved → TỰ XỬ LÝ:
      await tx.collateral.updateMany({
        where: { loanId: loan.id },
        data: { status: CollateralStatus.PLEDGED },
      });

      // 🔍 AUDIT LOG
      await tx.auditLog.create({
        data: {
          action: AuditActionEnum.APPROVE_LOAN,
          entityId: loan.id,
          entityType: AuditEntityType.LOAN,
          actorId: employee.id,
          actorName: employee.name,
          oldValue: {
            status: loan.status,
          },
          newValue: {
            status: LoanStatus.ACTIVE,
            notes: dto.note,
          },
          description: `Loan ${loan.id} approved`,
        },
      });

      return tx.loan.findUnique({
        where: { id: loan.id },
        include: {
          loanType: true,
          collaterals: {
            include: { collateralType: true },
          },
          store: true,
        },
      });
    });

    return {
      message: 'Loan approved',
      loan: LoanMapper.toLoanResponse(result),
    };
  }

  private async rejectLoan(
    loan: any,
    dto: ApproveLoanDto,
    employee: any,
  ): Promise<UpdateLoanStatusResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.REJECTED,
          rejectedAt: new Date(),
          rejectedBy: employee.id,
          notes: dto.note
            ? loan.notes + '\n- Rejection Note: ' + dto.note
            : loan.notes,
        },
      });

      // CollateralService cũng không có onLoanRejected → TỰ XỬ LÝ:
      await tx.collateral.updateMany({
        where: { loanId: loan.id },
        data: { status: CollateralStatus.REJECTED },
      });

      // 🔍 AUDIT LOG
      await tx.auditLog.create({
        data: {
          action: AuditActionEnum.REJECT_LOAN,
          entityId: loan.id,
          entityType: AuditEntityType.LOAN,
          actorId: employee.id,
          actorName: employee.name,
          oldValue: {
            status: loan.status,
          },
          newValue: {
            status: LoanStatus.REJECTED,
            notes: dto.note,
          },
          description: `Loan ${loan.id} rejected`,
        },
      });

      return tx.loan.findUnique({
        where: { id: loan.id },
        include: {
          loanType: true,
          collaterals: {
            include: { collateralType: true },
          },
          store: true,
        },
      });
    });

    return {
      message: 'Loan rejected',
      loan: LoanMapper.toLoanResponse(result),
    };
  }

  private diffObject<T extends Record<string, any>>(
    before: T,
    after: T,
  ): { oldValue: Partial<T>; newValue: Partial<T> } {
    const oldValue: Partial<T> = {};
    const newValue: Partial<T> = {};

    for (const key of Object.keys(after) as (keyof T)[]) {
      if (before[key] !== after[key]) {
        oldValue[key] = before[key];
        newValue[key] = after[key];
      }
    }

    return { oldValue, newValue };
  }

  // ================= HELPER VALIDATE =================
  private async validateUpdatePendingLoan(loan: any, dto: UpdateLoanDto) {
    if (dto.loanAmount !== undefined && dto.loanAmount <= 0) {
      throw new BadRequestException('Loan amount must be greater than 0');
    }

    if (dto.loanTypeId !== undefined) {
      const loanType = await this.prisma.loanType.findUnique({
        where: { id: dto.loanTypeId },
      });
      if (!loanType) {
        throw new NotFoundException('Loan type not found');
      }
    }

    if (
      dto.repaymentMethod !== undefined &&
      !Object.values(RepaymentMethod).includes(
        dto.repaymentMethod as RepaymentMethod,
      )
    ) {
      throw new BadRequestException('Invalid repayment method');
    }
  }
}
