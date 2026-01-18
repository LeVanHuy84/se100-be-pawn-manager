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
  Prisma,
  RepaymentMethod,
} from 'generated/prisma';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import { LoanSimulationsService } from '../loan-simulations/loan-simulations.service';
import { LoanSimulationRequestDto } from '../loan-simulations/dto/request/loan-simulation.request';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import { LoanStatusMachine } from './enum/loan.status-machine';
import { LoanResponseDto } from './dto/response/loan.response';
import { LoanMapper } from './loan.mapper';

import { CommunicationService } from '../communication/communication.service';
import { ReminderProcessor } from '../communication/reminder.processor';
import { DisbursementService } from '../disbursement/disbursement.service';

import { AuditActionEnum } from 'src/common/enums/audit-action.enum';
import { LoanCodeGenerate } from './loan-code.generate';
import { BaseResult } from 'src/common/dto/base.response';

@Injectable()
export class LoanOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loanSimulationsService: LoanSimulationsService,
    private readonly communicationService: CommunicationService,
    private readonly reminderProcessor: ReminderProcessor,
    private readonly loanCodeGenerate: LoanCodeGenerate,
    private readonly disbursementService: DisbursementService,
  ) {}

  async createLoan(
    dto: CreateLoanDto,
    employee: any,
  ): Promise<BaseResult<LoanResponseDto>> {
    try {
      const {
        customerId,
        loanTypeId,
        storeId,
        loanAmount,
        repaymentMethod,
        notes,
        collateralIds,
      } = dto;

      // Kiểm tra customer, store tồn tại
      const [customer, store] = await Promise.all([
        this.prisma.customer.findUnique({ where: { id: customerId } }),
        this.prisma.store.findUnique({
          where: { id: storeId ?? employee.storeId },
        }),
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
      // ================= VALIDATE COLLATERALS =================
      for (const c of collaterals) {
        if (c.loanId) {
          throw new BadRequestException(
            `Collateral ${c.id} is already attached to another loan`,
          );
        }

        if (c.status !== CollateralStatus.PROPOSED) {
          throw new BadRequestException(
            `Collateral ${c.id} is not in PROPOSED status`,
          );
        }
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
        totalFeeRate: totalCustodyFeeRate,
        loanTypeId,

        repaymentMethod: repaymentMethod as RepaymentMethod,
      };

      const simulationResult =
        await this.loanSimulationsService.createSimulation(simulationRequest);

      // =============== 3. Tạo loan + collateral trong transaction ===============
      const loan = await this.prisma.$transaction(async (tx) => {
        const loanCode = await this.loanCodeGenerate.generateLoanCode(tx);
        const loan = await tx.loan.create({
          data: {
            loanCode,
            customerId,
            loanAmount: Math.ceil(loanAmount), // Round up loan amount
            repaymentMethod: repaymentMethod as RepaymentMethod,
            loanTypeId,
            createdBy: employee.id,
            storeId: storeId ?? employee.storeId,

            // snapshot - already rounded from simulation
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
            entityName: loan.loanCode,
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
        return loan;
      });

      const fullLoan = await this.prisma.loan.findUnique({
        where: { id: loan.id },
        include: {
          loanType: true,
          collaterals: {
            include: {
              collateralType: true,
            },
          },
          store: true,
          customer: true,
        },
      });

      return {
        data: LoanMapper.toLoanResponse(fullLoan),
      };
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
  ): Promise<BaseResult<LoanResponseDto>> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { collaterals: true },
    });

    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException(
        'Only loans with PENDING status can be updated',
      );
    }

    // ================= SNAPSHOT BEFORE =================
    const existingIds = loan.collaterals.map((c) => c.id);
    const beforeUpdate = {
      loanAmount: loan.loanAmount.toString(),
      repaymentMethod: loan.repaymentMethod,
      loanTypeId: loan.loanTypeId,
      storeId: loan.storeId,
      durationMonths: loan.durationMonths,
      appliedInterestRate: loan.appliedInterestRate,
      latePaymentPenaltyRate: loan.latePaymentPenaltyRate,
      totalInterest: loan.totalInterest?.toString(),
      totalFees: loan.totalFees?.toString(),
      totalRepayment: loan.totalRepayment?.toString(),
      monthlyPayment: loan.monthlyPayment?.toString(),
    };

    await this.validateUpdatePendingLoan(loan, dto);

    // ================= COLLATERAL FINAL IDS =================
    const finalCollateralIds =
      dto.collateralIds ?? loan.collaterals.map((c) => c.id);

    const collaterals = await this.prisma.collateral.findMany({
      where: { id: { in: finalCollateralIds } },
      include: { collateralType: true },
    });

    for (const c of collaterals) {
      if (c.loanId && c.loanId !== loanId) {
        throw new BadRequestException(
          `Collateral ${c.id} belongs to another loan`,
        );
      }

      if (c.status !== CollateralStatus.PROPOSED) {
        throw new BadRequestException(
          `Collateral ${c.id} is not in PROPOSED status`,
        );
      }
    }

    const totalCustodyFeeRate = collaterals.reduce(
      (sum, c) => sum + c.collateralType.custodyFeeRateMonthly.toNumber(),
      0,
    );

    // ================= SIMULATION =================
    const simulation = await this.loanSimulationsService.createSimulation({
      loanAmount: dto.loanAmount ?? loan.loanAmount.toNumber(),
      loanTypeId: dto.loanTypeId ?? loan.loanTypeId,
      repaymentMethod:
        (dto.repaymentMethod as RepaymentMethod) ?? loan.repaymentMethod,
      totalFeeRate: totalCustodyFeeRate,
    });

    await this.prisma.$transaction(async (tx) => {
      // ================= UPDATE LOAN =================
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          loanAmount: new Prisma.Decimal(
            dto.loanAmount ?? loan.loanAmount.toNumber(),
          ),
          notes: dto.notes ?? loan.notes,
          repaymentMethod:
            (dto.repaymentMethod as RepaymentMethod) ?? loan.repaymentMethod,
          loanTypeId: dto.loanTypeId ?? loan.loanTypeId,
          storeId: dto.storeId ?? loan.storeId,
          // snapshot từ simulation
          durationMonths: simulation.durationMonths,
          appliedInterestRate: simulation.appliedInterestRate,
          totalInterest: simulation.totalInterest,
          totalFees: simulation.totalFees,
          totalRepayment: simulation.totalRepayment,
          monthlyPayment: simulation.monthlyPayment,
          remainingAmount: simulation.totalRepayment,
        },
      });

      // ================= COLLATERAL DIFF =================
      if (dto.collateralIds) {
        const toAdd = finalCollateralIds.filter(
          (id) => !existingIds.includes(id),
        );

        const toRemove = loan.collaterals.filter(
          (c) => !finalCollateralIds.includes(c.id),
        );

        const invalidRemove = toRemove.filter(
          (c) => c.status !== CollateralStatus.PROPOSED,
        );

        if (invalidRemove.length > 0) {
          throw new BadRequestException(
            'Some collaterals cannot be removed because they are no longer PROPOSED',
          );
        }

        if (toAdd.length > 0) {
          await tx.collateral.updateMany({
            where: { id: { in: toAdd } },
            data: { loanId },
          });
        }

        if (toRemove.length > 0) {
          await tx.collateral.updateMany({
            where: { id: { in: toRemove.map((c) => c.id) } },
            data: {
              loanId: null,
              status: CollateralStatus.PROPOSED,
            },
          });
        }
      }

      // ================= REBUILD SCHEDULE =================
      await tx.repaymentScheduleDetail.deleteMany({
        where: { loanId },
      });

      await tx.repaymentScheduleDetail.createMany({
        data: simulation.schedule.map((item) => ({
          loanId,
          periodNumber: item.periodNumber,
          dueDate: new Date(item.dueDate),
          beginningBalance: item.beginningBalance,
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          feeAmount: item.feeAmount,
          totalAmount: item.totalAmount,
        })),
      });

      // ================= AUDIT LOG =================
      const afterUpdate = {
        loanAmount: updatedLoan.loanAmount.toString(),
        repaymentMethod: updatedLoan.repaymentMethod,
        loanTypeId: updatedLoan.loanTypeId,
        storeId: updatedLoan.storeId,
        durationMonths: updatedLoan.durationMonths,
        appliedInterestRate: updatedLoan.appliedInterestRate,
        latePaymentPenaltyRate: updatedLoan.latePaymentPenaltyRate,
        totalInterest: updatedLoan.totalInterest?.toString(),
        totalFees: updatedLoan.totalFees?.toString(),
        totalRepayment: updatedLoan.totalRepayment?.toString(),
        monthlyPayment: updatedLoan.monthlyPayment?.toString(),
      };

      const { oldValue, newValue } = this.diffObject(beforeUpdate, afterUpdate);

      if (Object.keys(newValue).length > 0) {
        await tx.auditLog.create({
          data: {
            action: AuditActionEnum.UPDATE_LOAN,
            entityId: loan.id,
            entityType: AuditEntityType.LOAN,
            entityName: loan.loanCode,
            actorId: employee.id,
            actorName: employee.name,
            oldValue,
            newValue,
            description: `Updated loan ${loan.loanCode} (PENDING)`,
          },
        });
      }
    });

    const fullLoan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        loanType: true,
        collaterals: {
          include: {
            collateralType: true,
            store: true,
          },
        },
        customer: true,
      },
    });

    return {
      data: LoanMapper.toLoanResponse(fullLoan),
    };
  }

  // ---------------------------------------------------------------
  // UPDATE STATUS
  // ---------------------------------------------------------------
  async updateStatus(
    loanId: string,
    dto: ApproveLoanDto,
    employee: any,
  ): Promise<BaseResult<LoanResponseDto>> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { collaterals: true, customer: true },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    let result: { message: string; loan: LoanResponseDto };

    switch (dto.status) {
      case 'ACTIVE':
        if (!LoanStatusMachine.canTransition(loan.status, LoanStatus.ACTIVE)) {
          throw new BadRequestException('Invalid status transition');
        }
        result = await this.approveLoan(loan, dto, employee);
        break;
      case 'REJECTED':
        if (
          !LoanStatusMachine.canTransition(loan.status, LoanStatus.REJECTED)
        ) {
          throw new BadRequestException('Invalid status transition');
        }
        result = await this.rejectLoan(loan, dto, employee);
        break;
      default:
        throw new BadRequestException('Invalid status update request');
    }

    return {
      data: result.loan,
    };
  }

  private async approveLoan(loan: any, dto: ApproveLoanDto, employee: any) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.loan.update({
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
          entityName: loan.loanCode,
          actorId: employee.id,
          actorName: employee.name,
          oldValue: {
            status: loan.status,
          },
          newValue: {
            status: LoanStatus.ACTIVE,
            notes: dto.note,
          },
          description: `Loan ${loan.loanCode} approved`,
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
          customer: true,
        },
      });
    });

    //  CREATE DISBURSEMENT LOG using DisbursementService
    try {
      // Generate unique idempotency key for this disbursement using timestamp and loanId
      const idempotencyKey = `disbursement-${loan.id}-${Date.now()}`;
      await this.disbursementService.createDisbursement(idempotencyKey, {
        loanId: loan.id,
        storeId: loan.storeId,
        amount: Number(loan.loanAmount),
        disbursementMethod: 'CASH',
        disbursedBy: employee.id,
        recipientName: loan.customer.fullName,
        recipientIdNumber: loan.customer.nationalId,
        notes: `Disbursement for approved loan ${loan.loanCode}`,
      });
    } catch (error) {
      console.error('Failed to create disbursement log:', error);
    }

    // Schedule welcome notification (SMS/Email) immediately after approval
    try {
      await this.communicationService.scheduleWelcomeNotification(loan.id);
    } catch (error) {
      // Log error but don't fail the approval
      console.error('Failed to send welcome notification:', error);
    }

    // Schedule all future payment reminders with delay
    try {
      const scheduled =
        await this.reminderProcessor.scheduleAllRemindersForLoan(loan.id);
      console.log(
        `Scheduled ${scheduled} payment reminders for loan ${loan.id}`,
      );
    } catch (error) {
      // Log error but don't fail the approval
      console.error('Failed to schedule payment reminders:', error);
    }

    return {
      message: 'Loan approved',
      loan: LoanMapper.toLoanResponse(result),
    };
  }

  private async rejectLoan(loan: any, dto: ApproveLoanDto, employee: any) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.loan.update({
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
          entityName: loan.loanCode,
          actorId: employee.id,
          actorName: employee.name,
          oldValue: {
            status: loan.status,
          },
          newValue: {
            status: LoanStatus.REJECTED,
            notes: dto.note,
          },
          description: `Loan ${loan.loanCode} rejected`,
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
          customer: true,
        },
      });
    });

    return {
      message: 'Loan rejected',
      loan: LoanMapper.toLoanResponse(result),
    };
  }

  private normalizeValue(value: any) {
    if (value === undefined || value === null) return null;

    // Prisma Decimal
    if (typeof value === 'object' && typeof value.toString === 'function') {
      return value.toString();
    }

    return value;
  }

  private diffObject<T extends Record<string, any>>(
    before: T,
    after: T,
  ): { oldValue: Partial<T>; newValue: Partial<T> } {
    const oldValue: Partial<T> = {};
    const newValue: Partial<T> = {};

    for (const key of Object.keys(after) as (keyof T)[]) {
      const beforeVal = this.normalizeValue(before[key]);
      const afterVal = this.normalizeValue(after[key]);

      if (beforeVal !== afterVal) {
        oldValue[key] = beforeVal as any;
        newValue[key] = afterVal as any;
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
