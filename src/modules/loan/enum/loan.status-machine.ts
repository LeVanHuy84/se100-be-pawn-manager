import { LoanStatus } from 'generated/prisma';

const VALID_TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  [LoanStatus.PENDING]: [LoanStatus.ACTIVE, LoanStatus.REJECTED],
  [LoanStatus.ACTIVE]: [LoanStatus.CLOSED, LoanStatus.OVERDUE],
  [LoanStatus.OVERDUE]: [LoanStatus.CLOSED],
  [LoanStatus.REJECTED]: [],
  [LoanStatus.CLOSED]: [],
};

export class LoanStatusMachine {
  static canTransition(from: LoanStatus, to: LoanStatus) {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }
}
