import { NotificationType } from 'generated/prisma';

// Optimized: Store only IDs, fetch data during processing
export interface OptimizedNotificationJob {
  loanId: string;
  customerId: string;
  periodNumber?: number;
  type: NotificationType;
}

// Legacy: Keep for backward compatibility
export interface NotificationJob {
  loanId: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  type: NotificationType;
  dueDate?: string;
  amount?: number;
  periodNumber?: number;
  daysOverdue?: number;
  penalty?: number;
  // For LOAN_APPROVED
  loanAmount?: number;
  // For PAYMENT_CONFIRMATION
  paymentId?: string;
  allocations?: Array<{
    periodNumber: number;
    component: string;
    amount: number;
  }>;
}

export interface SmsJobData extends NotificationJob {
  message: string;
}

export interface EmailJobData extends NotificationJob {
  subject: string;
  message: string;
}
