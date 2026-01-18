import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { LoanSimulationsService } from './loan-simulations.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepaymentMethod } from 'generated/prisma';
import { LoanSimulationRequestDto } from './dto/request/loan-simulation.request';

describe('LoanSimulationsService', () => {
  let service: LoanSimulationsService;
  let prismaService: PrismaService;

  const mockLoanType = {
    id: 'test-loan-type-id',
    name: 'Standard Loan',
    durationMonths: 6,
    interestRateMonthly: { toNumber: () => 2.5 }, // Mock Prisma Decimal
    managementFeeRate: { toNumber: () => 1.0 },
    custodyFeeRateMonthly: { toNumber: () => 0.5 },
    ltvRatio: { toNumber: () => 70 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanSimulationsService,
        {
          provide: PrismaService,
          useValue: {
            loanType: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<LoanSimulationsService>(LoanSimulationsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSimulation', () => {
    it('should throw error if loanType not found', async () => {
      jest.spyOn(prismaService.loanType, 'findUnique').mockResolvedValue(null);

      const dto: LoanSimulationRequestDto = {
        loanAmount: 10000000,
        totalFeeRate: 1.5,
        loanTypeId: 'non-existent-id',
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
      };

      await expect(service.createSimulation(dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.createSimulation(dto)).rejects.toThrow(
        'LoanType with id "non-existent-id" not found',
      );
    });

    it('should throw error if durationMonths is invalid', async () => {
      jest.spyOn(prismaService.loanType, 'findUnique').mockResolvedValue({
        ...mockLoanType,
        durationMonths: 0,
      } as any);

      const dto: LoanSimulationRequestDto = {
        loanAmount: 10000000,
        totalFeeRate: 1.5,
        loanTypeId: 'test-loan-type-id',
        repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
      };

      await expect(service.createSimulation(dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    describe('EQUAL_INSTALLMENT repayment method', () => {
      it('should calculate loan simulation correctly', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 10000000, // 10M VND
          totalFeeRate: 1.5, // 1.5% per month
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        // Basic assertions
        expect(result.loanAmount).toBe(10000000);
        expect(result.durationMonths).toBe(6);
        expect(result.productType).toBe('Standard Loan');
        expect(result.appliedInterestRate).toBe(2.5);
        expect(result.appliedMgmtFeeRateMonthly).toBe(1.5);

        // Schedule should have 6 periods
        expect(result.schedule).toHaveLength(6);

        // Verify total amounts are rounded up (Math.ceil)
        expect(result.totalInterest).toBeGreaterThan(0);
        expect(result.totalFees).toBeGreaterThan(0);
        expect(result.totalRepayment).toBe(
          result.loanAmount + result.totalInterest + result.totalFees,
        );

        // First period checks
        const period1 = result.schedule[0];
        expect(period1.periodNumber).toBe(1);
        expect(period1.beginningBalance).toBe(10000000);
        expect(period1.principalAmount).toBeGreaterThan(0);
        expect(period1.interestAmount).toBeGreaterThan(0);
        expect(period1.feeAmount).toBeGreaterThan(0);
        expect(period1.totalAmount).toBe(
          period1.principalAmount + period1.interestAmount + period1.feeAmount,
        );

        // Last period should pay off remaining principal
        const lastPeriod = result.schedule[5];
        expect(lastPeriod.periodNumber).toBe(6);

        // Sum of all principal amounts should equal loan amount
        const totalPrincipalPaid = result.schedule.reduce(
          (sum, item) => sum + item.principalAmount,
          0,
        );
        expect(totalPrincipalPaid).toBe(10000000);

        // Verify interest calculation (2.5% on declining balance)
        const firstInterest = Math.ceil(10000000 * 0.025);
        expect(period1.interestAmount).toBe(firstInterest);
      });

      it('should handle different loan amounts correctly', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 50000000, // 50M VND
          totalFeeRate: 2.0,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        expect(result.loanAmount).toBe(50000000);

        // Verify principal per month
        const expectedPrincipalPerMonth = Math.ceil(50000000 / 6);
        expect(result.schedule[0].principalAmount).toBeLessThanOrEqual(
          expectedPrincipalPerMonth + 1,
        );

        // Total principal should equal loan amount
        const totalPrincipal = result.schedule.reduce(
          (sum, item) => sum + item.principalAmount,
          0,
        );
        expect(totalPrincipal).toBe(50000000);
      });

      it('should apply Math.ceil to all customer-facing amounts', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 10000000,
          totalFeeRate: 1.33, // Fractional rate to test rounding
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        // All amounts should be integers (rounded up)
        result.schedule.forEach((period) => {
          expect(period.beginningBalance % 1).toBe(0);
          expect(period.principalAmount % 1).toBe(0);
          expect(period.interestAmount % 1).toBe(0);
          expect(period.feeAmount % 1).toBe(0);
          expect(period.totalAmount % 1).toBe(0);
        });

        expect(result.totalInterest % 1).toBe(0);
        expect(result.totalFees % 1).toBe(0);
        expect(result.totalRepayment % 1).toBe(0);
        expect(result.monthlyPayment % 1).toBe(0);
      });
    });

    describe('INTEREST_ONLY repayment method', () => {
      it('should calculate interest-only loan correctly', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 20000000, // 20M VND
          totalFeeRate: 1.5,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.INTEREST_ONLY,
        };

        const result = await service.createSimulation(dto);

        expect(result.loanAmount).toBe(20000000);
        expect(result.schedule).toHaveLength(6);

        // For interest-only: principal is 0 for periods 1-5
        for (let i = 0; i < 5; i++) {
          const period = result.schedule[i];
          expect(period.principalAmount).toBe(0);
          expect(period.beginningBalance).toBe(20000000); // Balance stays same
          expect(period.interestAmount).toBeGreaterThan(0);
          expect(period.feeAmount).toBeGreaterThan(0);
        }

        // Last period should include full principal
        const lastPeriod = result.schedule[5];
        expect(lastPeriod.principalAmount).toBe(20000000);
        expect(lastPeriod.interestAmount).toBeGreaterThan(0);
        expect(lastPeriod.feeAmount).toBeGreaterThan(0);

        // Verify interest is consistent (2.5% of 20M each month)
        const expectedMonthlyInterest = Math.ceil(20000000 * 0.025);
        expect(result.schedule[0].interestAmount).toBe(expectedMonthlyInterest);
      });

      it('should adjust last period to match expected totals', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 15000000,
          totalFeeRate: 1.7, // Fractional to trigger rounding adjustments
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.INTEREST_ONLY,
        };

        const result = await service.createSimulation(dto);

        // Sum of all interest should match totalInterest
        const totalInterestSum = result.schedule.reduce(
          (sum, item) => sum + item.interestAmount,
          0,
        );
        expect(totalInterestSum).toBe(result.totalInterest);

        // Sum of all fees should match totalFees
        const totalFeesSum = result.schedule.reduce(
          (sum, item) => sum + item.feeAmount,
          0,
        );
        expect(totalFeesSum).toBe(result.totalFees);

        // Last period may have adjusted amounts
        const lastPeriod = result.schedule[5];
        expect(lastPeriod.periodNumber).toBe(6);
      });

      it('should apply Math.ceil consistently', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 12345678,
          totalFeeRate: 1.234,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.INTEREST_ONLY,
        };

        const result = await service.createSimulation(dto);

        // All amounts should be integers
        result.schedule.forEach((period) => {
          expect(period.interestAmount % 1).toBe(0);
          expect(period.feeAmount % 1).toBe(0);
          expect(period.totalAmount % 1).toBe(0);
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle minimum loan amount', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 1000000, // 1M VND
          totalFeeRate: 1.5,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        expect(result.loanAmount).toBe(1000000);
        expect(result.schedule).toHaveLength(6);

        // Verify calculations are correct even for small amounts
        const totalPrincipal = result.schedule.reduce(
          (sum, item) => sum + item.principalAmount,
          0,
        );
        expect(totalPrincipal).toBe(1000000);
      });

      it('should handle single month duration', async () => {
        jest.spyOn(prismaService.loanType, 'findUnique').mockResolvedValue({
          ...mockLoanType,
          durationMonths: 1,
          interestRateMonthly: { toNumber: () => 2.5 },
        } as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 5000000,
          totalFeeRate: 2.0,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.INTEREST_ONLY,
        };

        const result = await service.createSimulation(dto);

        expect(result.schedule).toHaveLength(1);
        expect(result.schedule[0].principalAmount).toBe(5000000);
        expect(result.schedule[0].interestAmount).toBeGreaterThan(0);
        expect(result.schedule[0].feeAmount).toBeGreaterThan(0);
      });

      it('should throw error for unsupported repayment method', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 10000000,
          totalFeeRate: 1.5,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: 'UNSUPPORTED_METHOD' as any,
        };

        await expect(service.createSimulation(dto)).rejects.toThrow(
          UnprocessableEntityException,
        );
      });

      it('should handle large loan amounts', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 1000000000, // 1 billion VND
          totalFeeRate: 2.5,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        expect(result.loanAmount).toBe(1000000000);
        expect(result.totalRepayment).toBeGreaterThan(1000000000);

        // Verify no overflow or precision issues
        const totalPrincipal = result.schedule.reduce(
          (sum, item) => sum + item.principalAmount,
          0,
        );
        expect(totalPrincipal).toBe(1000000000);
      });
    });

    describe('Date calculations', () => {
      it('should generate correct due dates', async () => {
        jest
          .spyOn(prismaService.loanType, 'findUnique')
          .mockResolvedValue(mockLoanType as any);

        const dto: LoanSimulationRequestDto = {
          loanAmount: 10000000,
          totalFeeRate: 1.5,
          loanTypeId: 'test-loan-type-id',
          repaymentMethod: RepaymentMethod.EQUAL_INSTALLMENT,
        };

        const result = await service.createSimulation(dto);

        // Due dates should be in ISO format YYYY-MM-DD
        result.schedule.forEach((period) => {
          expect(period.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        // Due dates should be sequential (roughly 1 month apart)
        for (let i = 1; i < result.schedule.length; i++) {
          const prevDate = new Date(result.schedule[i - 1].dueDate);
          const currDate = new Date(result.schedule[i].dueDate);
          expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
        }
      });
    });
  });
});
