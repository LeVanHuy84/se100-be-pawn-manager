import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LogCommunicationDto } from './dto/log-communication.dto';
import { NotificationLogResponse } from './dto/notification-log.response';
import { ReminderProcessor } from './reminder.processor';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminderProcessor: ReminderProcessor,
  ) {}

  /**
   * Log a communication attempt (call, SMS, email) with a customer
   */
  async logCommunication(
    dto: LogCommunicationDto,
    employeeId: string,
  ): Promise<NotificationLogResponse> {
    const {
      loanId,
      type,
      channel,
      status,
      subject,
      notes,
      callDuration,
      promiseToPayDate,
    } = dto;

    // Verify loan exists and get customer info
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Create notification log
    const log = await this.prisma.notificationLog.create({
      data: {
        type,
        channel,
        status,
        loanId,
        customerId: loan.customerId,
        subject,
        message: notes,
        recipientContact:
          channel === 'PHONE_CALL' ? loan.customer.phone : loan.customer.email,
        callDuration,
        employeeId,
        notes,
        promiseToPayDate: promiseToPayDate
          ? new Date(promiseToPayDate)
          : undefined,
        sentAt: new Date(),
      },
      include: {
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return this.mapToResponse(log);
  }

  /**
   * Get communication history for a loan
   */
  async getLoanCommunicationHistory(
    loanId: string,
  ): Promise<NotificationLogResponse[]> {
    const logs = await this.prisma.notificationLog.findMany({
      where: { loanId },
      include: {
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => this.mapToResponse(log));
  }

  /**
   * Get upcoming promise-to-pay dates
   */
  async getPromisesToPay(params?: {
    fromDate?: Date;
    toDate?: Date;
  }): Promise<NotificationLogResponse[]> {
    const { fromDate, toDate } = params || {};

    const where: any = {
      status: 'PROMISE_TO_PAY',
      promiseToPayDate: {
        not: null,
      },
    };

    if (fromDate || toDate) {
      where.promiseToPayDate = {
        ...where.promiseToPayDate,
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const logs = await this.prisma.notificationLog.findMany({
      where,
      include: {
        customer: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        loan: {
          select: {
            loanAmount: true,
            remainingAmount: true,
          },
        },
      },
      orderBy: { promiseToPayDate: 'asc' },
    });

    return logs.map((log) => this.mapToResponse(log));
  }

  private mapToResponse(log: any): NotificationLogResponse {
    return {
      id: log.id,
      type: log.type,
      channel: log.channel,
      status: log.status,
      loanId: log.loanId,
      customerId: log.customerId,
      customerName: log.customer?.fullName,
      customerPhone: log.customer?.phone,
      subject: log.subject,
      message: log.message,
      recipientContact: log.recipientContact,
      callDuration: log.callDuration,
      employeeId: log.employeeId,
      notes: log.notes,
      promiseToPayDate: log.promiseToPayDate
        ? log.promiseToPayDate.toISOString().slice(0, 10)
        : null,
      sentAt: log.sentAt ? log.sentAt.toISOString() : null,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    };
  }

  /**
   * Schedule welcome notification immediately after loan creation
   * Called right after repayment schedule is created
   */
  async scheduleWelcomeNotification(loanId: string): Promise<void> {
    await this.reminderProcessor.sendWelcomeNotification(loanId);
  }

  /**
   * Schedule payment confirmation notification immediately after payment
   * @param loanId - Loan ID
   * @param paymentId - Payment transaction ID
   * @param amount - Payment amount
   * @param allocations - Payment allocations detail
   */
  async schedulePaymentConfirmation(
    loanId: string,
    paymentId: string,
    amount: number,
    allocations: Array<{
      periodNumber: number;
      component: string;
      amount: number;
    }>,
  ): Promise<void> {
    await this.reminderProcessor.sendPaymentConfirmation(
      loanId,
      paymentId,
      amount,
      allocations,
    );
  }
}
