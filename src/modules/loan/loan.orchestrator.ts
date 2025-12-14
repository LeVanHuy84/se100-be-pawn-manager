import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import {
  CollateralStatus,
  LoanStatus,
  RepaymentMethod,
} from 'generated/prisma';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import { LoanSimulationsService } from '../loan-simulations/loan-simulations.service';
import { LoanSimulationRequestDto } from '../loan-simulations/dto/request/loan-simulation.request';
import { UpdateLoanDto } from './dto/request/update-loan.dto';
import e from 'express';
import { LoanStatusMachine } from './enum/loan.status-machine';

@Injectable()
export class LoanOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loanSimulationsService: LoanSimulationsService,
  ) {}

  async createLoan(dto: CreateLoanDto) {
    try {
      const {
        customerId,
        loanTypeId,
        loanAmount,
        repaymentMethod,
        notes,
        collateralIds,
      } = dto;

      const iLoanTypeId = Number(loanTypeId);

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
        loanTypeId: iLoanTypeId,
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
            loanTypeId: iLoanTypeId,

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

        return {
          loan,
          message:
            'Loan application created successfully. Status: PENDING. Awaiting approval.',
        };
      });
    } catch (error) {
      console.error('CREATE LOAN ERROR:', error);
      throw new BadRequestException('Failed to create loan application', error);
    }
  }

  // ---------------------------------------------------------------
  // UPDATE LOAN nếu còn PENDING
  // ---------------------------------------------------------------
  async updateLoan(loanId: string, dto: UpdateLoanDto) {
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

      const iLoanTypeId =
        dto.loanTypeId !== undefined ? Number(dto.loanTypeId) : loan.loanTypeId;

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
        loanTypeId: iLoanTypeId,
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
            loanTypeId: iLoanTypeId,
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
          return { loan: updatedLoan };
        }

        // lấy collateral hiện tại
        const existingCollaterals = await tx.collateral.findMany({
          where: { loanId },
          select: { id: true },
        });
        const existingIds = existingCollaterals.map((c) => c.id);

        const collateralsToAdd = finalCollateralIds.filter(
          (id) => !existingIds.includes(id),
        );

        await tx.collateral.updateMany({
          where: { id: { in: collateralsToAdd } },
          data: { loanId },
        });

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

        return {
          message: 'Loan updated successfully (PENDING stage)',
          loan: updatedLoan,
        };
      });
    } catch (error) {
      console.error('CREATE LOAN ERROR:', error);
      throw new BadRequestException('Failed to update loan', error);
    }
  }

  // ---------------------------------------------------------------
  // UPDATE STATUS (giữ nguyên)
  // ---------------------------------------------------------------
  async updateStatus(loanId: string, dto: ApproveLoanDto, employeeId: string) {
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
        return this.approveLoan(loan, dto, employeeId);
      case 'REJECTED':
        if (
          !LoanStatusMachine.canTransition(loan.status, LoanStatus.REJECTED)
        ) {
          throw new BadRequestException('Invalid status transition');
        }
        return this.rejectLoan(loan, dto, employeeId);
      default:
        throw new BadRequestException('Invalid status update request');
    }
  }

  private async approveLoan(
    loan: any,
    dto: ApproveLoanDto,
    employeeId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.ACTIVE,
          approvedAt: new Date(),
          approvedBy: employeeId,
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

      return updatedLoan;
    });

    return { message: 'Loan approved', loan: result };
  }

  private async rejectLoan(loan: any, dto: ApproveLoanDto, employeeId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.REJECTED,
          rejectedAt: new Date(),
          rejectedBy: employeeId,
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

      return updatedLoan;
    });

    return { message: 'Loan rejected', loan: result };
  }
}
