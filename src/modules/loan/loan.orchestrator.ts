import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CollateralService } from '../collateral/collateral.service';
import { CreateLoanDto } from './dto/request/create-loan.dto';
import { AssetStatus, LoanStatus, RepaymentMethod } from 'generated/prisma';
import { ApproveLoanDto } from './dto/request/approve-loan.dto';
import { LoanSimulationsService } from '../loan-simulations/loan-simulations.service';
import { LoanSimulationRequestDto } from '../loan-simulations/dto/request/loan-simulation.request';
import { UpdateLoanDto } from './dto/request/update-loan.dto';

@Injectable()
export class LoanOrchestrator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collateralService: CollateralService,
    private readonly loanSimulationsService: LoanSimulationsService,
  ) {}

  async createLoan(dto: CreateLoanDto) {
    const {
      customerId,
      loanTypeId,
      loanAmount,
      repaymentMethod,
      notes,
      assets,
    } = dto;

    // =============== 1. simulate ===============
    const loanType = await this.prisma.loanType.findUnique({
      where: { id: loanTypeId },
    });

    if (!loanType) {
      throw new NotFoundException('Loan product type not found');
    }

    const simulationRequest: LoanSimulationRequestDto = {
      amount: loanAmount,
      productType: loanType.name,
    };

    // =============== 2. Lấy phí ===============
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

          // snapshot
          durationMonths: loanType.durationMonths,
          appliedInterestRate: loanType.interestRateMonthly,

          latePaymentPenaltyRate: simulationResult.latePaymentPenaltyRate,
          totalInterest: simulationResult.totalInterest,
          totalFees: simulationResult.totalFees,
          totalRepayment: simulationResult.totalRepayment,
          monthlyPayment: simulationResult.monthlyPayment,

          remainingAmount: simulationResult.totalRepayment,
          status: LoanStatus.PENDING,
          notes,
        },
      });

      // =============== 4. Tạo collateral ===============
      if (assets?.length) {
        for (const item of assets) {
          await this.collateralService.create(item, loan.id, tx);
        }
      }

      return {
        loan,
        message:
          'Loan application created successfully. Status: PENDING. Awaiting approval.',
      };
    });
  }

  // ---------------------------------------------------------------
  // UPDATE LOAN nếu còn PENDING
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // UPDATE LOAN nếu còn PENDING
  // ---------------------------------------------------------------
  async updateLoan(loanId: string, dto: UpdateLoanDto) {
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

    return this.prisma.$transaction(async (tx) => {
      // -----------------------------------------------------------
      // 1. Update các trường LOAN cơ bản
      // -----------------------------------------------------------
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          loanAmount: dto.loanAmount ?? loan.loanAmount,
          notes: dto.notes ?? loan.notes,
          repaymentMethod:
            (dto.repaymentMethod as RepaymentMethod) ?? loan.repaymentMethod,
          loanTypeId: dto.loanTypeId ?? loan.loanTypeId,
        },
      });

      // Nếu không gửi assets thì không update collateral
      if (!dto.assets) {
        return { loan: updatedLoan };
      }

      // -----------------------------------------------------------
      // 2. Xử lý ASSETS
      // -----------------------------------------------------------

      const existing = loan.collaterals; // collateral hiện tại
      const incoming = dto.assets;

      const incomingIds = incoming
        .map((a) => a.id)
        .filter((x) => x !== undefined);

      // ---------- 2.1 XÓA ASSETS không còn trong request ----------
      const toDelete = existing.filter((c) => !incomingIds.includes(c.id));

      for (const del of toDelete) {
        await tx.asset.delete({
          where: { id: del.id },
        });
      }

      // ---------- 2.2 TẠO + UPDATE ----------
      for (const asset of incoming) {
        if (asset.id) {
          // Update existing
          await tx.asset.update({
            where: { id: asset.id },
            data: {
              assetTypeId: asset.assetTypeId,
              ownerName: asset.ownerName,
              assetInfo: asset.assetInfo,
              images: asset.images,
              storageLocation: asset.storageLocation,
              receivedDate: asset.receivedDate,
              appraisedValue: asset.appraisedValue,
              ltvRatio: asset.ltvRatio,
              appraisalDate: asset.appraisalDate,
              appraisalNotes: asset.appraisalNotes,
            },
          });
        } else {
          // Create new
          await this.collateralService.create(asset, loanId, tx);
        }
      }

      // -----------------------------------------------------------
      return {
        message: 'Loan updated successfully (PENDING stage)',
        loan: updatedLoan,
      };
    });
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
        return this.approveLoan(loan, dto, employeeId);
      case 'REJECTED':
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
    // Đáng lẽ phải có 1 phần check coi collateral đã được kiểm định chưa

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loan.id },
        data: {
          status: LoanStatus.ACTIVE,
          approvedAt: new Date(),
          approvedBy: employeeId,
          notes: dto.note ?? loan.notes,
        },
      });

      // CollateralService mới không có onLoanApproved → TỰ XỬ LÝ:
      await tx.asset.updateMany({
        where: { loanId: loan.id },
        data: { status: AssetStatus.PLEDGED },
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
          notes: dto.note ?? loan.notes,
        },
      });

      // CollateralService cũng không có onLoanRejected → TỰ XỬ LÝ:
      await tx.asset.updateMany({
        where: { loanId: loan.id },
        data: { status: AssetStatus.REJECTED },
      });

      return updatedLoan;
    });

    return { message: 'Loan rejected', loan: result };
  }
}
