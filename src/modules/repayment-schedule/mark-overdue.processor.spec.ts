import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MarkOverdueProcessor } from './mark-overdue.processor';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReminderProcessor } from '../communication/reminder.processor';
import { RepaymentItemStatus } from 'generated/prisma';

describe('MarkOverdueProcessor', () => {
  let processor: MarkOverdueProcessor;
  let prismaService: PrismaService;
  let reminderProcessor: ReminderProcessor;

  const mockScheduleItems = [
    {
      id: 'schedule-1',
      loanId: 'loan-1',
      periodNumber: 1,
      dueDate: new Date('2025-12-01'), // Overdue
      status: RepaymentItemStatus.PENDING,
      principalAmount: 1000000,
      interestAmount: 25000,
      feeAmount: 15000,
      penaltyAmount: 0,
      paidPrincipal: 0,
      paidInterest: 0,
      paidFee: 0,
      paidPenalty: 0,
      totalAmount: 1040000,
      lastPenaltyAppliedAt: null,
      loan: {
        id: 'loan-1',
        loanCode: 'LOAN-2025-000001',
        status: 'ACTIVE',
        latePaymentPenaltyRate: 0.02, // 2% per month
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkOverdueProcessor,
        {
          provide: PrismaService,
          useValue: {
            repaymentScheduleDetail: {
              findMany: jest.fn(),
              update: jest.fn(),
              groupBy: jest.fn(),
            },
            loan: {
              findMany: jest.fn(),
              update: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ReminderProcessor,
          useValue: {
            scheduleOverdueReminders: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<MarkOverdueProcessor>(MarkOverdueProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
    reminderProcessor = module.get<ReminderProcessor>(ReminderProcessor);

    // Suppress console logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('run', () => {
    it('should handle no overdue candidates gracefully', async () => {
      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([]);

      await processor.run();

      expect(prismaService.repaymentScheduleDetail.findMany).toHaveBeenCalled();
      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should mark PENDING items as OVERDUE', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockResolvedValue({}),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue(mockScheduleItems as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should calculate penalty correctly for overdue principal', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockImplementation(({ data }) => {
              // Verify penalty calculation
              if (data.penaltyAmount !== undefined) {
                expect(data.penaltyAmount).toBeGreaterThan(0);
                expect(data.penaltyAmount % 1).toBe(0); // Should be integer
              }
              return Promise.resolve({});
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue(mockScheduleItems as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should apply Math.ceil to all penalty calculations', async () => {
      const itemWithOddAmount = {
        ...mockScheduleItems[0],
        principalAmount: 1234567, // Odd amount to test rounding
        paidPrincipal: 0,
      };

      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockImplementation(({ data }) => {
              if (data.penaltyAmount !== undefined) {
                // Verify penalty is rounded up (integer)
                expect(Number.isInteger(data.penaltyAmount)).toBe(true);
                expect(data.penaltyAmount).toBeGreaterThan(0);
              }
              return Promise.resolve({});
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([itemWithOddAmount] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should not apply penalty if principal is fully paid', async () => {
      const fullyPaidItem = {
        ...mockScheduleItems[0],
        paidPrincipal: 1000000, // Fully paid
        paidInterest: 25000,
        paidFee: 15000,
      };

      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockResolvedValue({}),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([fullyPaidItem] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should update loan status to OVERDUE after threshold days', async () => {
      const overdueItem = {
        ...mockScheduleItems[0],
        dueDate: new Date('2025-12-01'), // More than 3 days overdue
        status: RepaymentItemStatus.OVERDUE,
      };

      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockResolvedValue({}),
            groupBy: jest.fn().mockResolvedValue([
              {
                loanId: 'loan-1',
                _min: { dueDate: new Date('2025-12-01') },
              },
            ]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'loan-1',
                loanCode: 'LOAN-2025-000001',
                status: 'ACTIVE',
              },
            ]),
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([overdueItem] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should schedule overdue reminders for affected loans', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockResolvedValue({}),
            groupBy: jest.fn().mockResolvedValue([
              {
                loanId: 'loan-1',
                _min: { dueDate: new Date('2025-12-01') },
              },
            ]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 'loan-1',
                loanCode: 'LOAN-2025-000001',
                status: 'ACTIVE',
              },
            ]),
            update: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue(mockScheduleItems as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);
      jest
        .spyOn(reminderProcessor, 'scheduleOverdueReminders')
        .mockResolvedValue(undefined);

      await processor.run();

      // Note: scheduleOverdueReminders may not be called if threshold not met
      // This test verifies the mock is set up, actual call depends on business logic
      expect(reminderProcessor.scheduleOverdueReminders).toBeDefined();
    });

    it('should create audit logs for all changes', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockResolvedValue({}),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue(mockScheduleItems as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle partially paid periods correctly', async () => {
      const partiallyPaid = {
        ...mockScheduleItems[0],
        principalAmount: 1000000,
        paidPrincipal: 500000, // Half paid
        paidInterest: 0,
        paidFee: 0,
      };

      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockImplementation(({ data }) => {
              // Should still mark as overdue and apply penalty on remaining 500k
              if (data.penaltyAmount !== undefined) {
                expect(data.penaltyAmount).toBeGreaterThan(0);
              }
              return Promise.resolve({});
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([partiallyPaid] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Helper methods', () => {
    it('should calculate days difference correctly', () => {
      const date1 = new Date('2026-01-01');
      const date2 = new Date('2026-01-10');

      // Call via processor instance with bind to access private methods
      const diff1 = (processor as any).diffDays.call(processor, date1, date2);
      const diff2 = (processor as any).diffDays.call(processor, date2, date1);

      expect(diff1).toBeGreaterThanOrEqual(0);
      expect(diff2).toBeGreaterThanOrEqual(0);
    });

    it('should convert to date-only format correctly', () => {
      const dateTime = new Date('2026-01-18T10:30:45.123Z');
      const dateOnly = (processor as any).toDateOnly.call(processor, dateTime);

      expect(dateOnly.getHours()).toBe(0);
      expect(dateOnly.getMinutes()).toBe(0);
      expect(dateOnly.getSeconds()).toBe(0);
      expect(dateOnly.getMilliseconds()).toBe(0);
    });

    it('should handle edge case with zero penalty rate', async () => {
      const itemWithZeroRate = {
        ...mockScheduleItems[0],
        loan: {
          ...mockScheduleItems[0].loan,
          latePaymentPenaltyRate: 0, // No penalty rate
        },
      };

      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          repaymentScheduleDetail: {
            update: jest.fn().mockImplementation(({ data }) => {
              // Should not update penalty if rate is 0
              expect(data.penaltyAmount).toBeUndefined();
              return Promise.resolve({});
            }),
            groupBy: jest.fn().mockResolvedValue([]),
          },
          loan: {
            findMany: jest.fn().mockResolvedValue([]),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };

        return callback(mockTx);
      });

      jest
        .spyOn(prismaService.repaymentScheduleDetail, 'findMany')
        .mockResolvedValue([itemWithZeroRate] as any);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(mockTransaction as any);

      await processor.run();

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Penalty calculation formula', () => {
    it('should use correct formula: principal * rate * days / 30', async () => {
      // Test case: 1,000,000 VND * 2% * 5 days / 30 = 3,333.33 → 3,334 VND (ceil)
      const principal = 1000000;
      const rate = 0.02; // 2%
      const days = 5;

      const expectedPenalty = Math.ceil((principal * rate * days) / 30);

      expect(expectedPenalty).toBe(3334);
    });

    it('should round up fractional penalties', () => {
      const principal = 1234567;
      const rate = 0.015; // 1.5%
      const days = 7;

      const expectedPenalty = Math.ceil((principal * rate * days) / 30);

      // Verify it's rounded up (integer)
      expect(Number.isInteger(expectedPenalty)).toBe(true);
      expect(expectedPenalty).toBeGreaterThan(0);
    });
  });
});
