import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * SMS Service with Twilio integration
 * Falls back to mock mode if Twilio credentials not configured
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient?: Twilio;
  private readonly isMockMode: boolean;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get('TWILIO_AUTH_TOKEN');
    const smsEnabled = this.config.get('SMS_ENABLED', 'false') === 'true';

    if (accountSid && authToken && smsEnabled) {
      this.twilioClient = new Twilio(accountSid, authToken);
      this.isMockMode = false;
      this.logger.log('✅ Twilio SMS service initialized');
    } else {
      this.isMockMode = true;
      if (!smsEnabled) {
        this.logger.warn('⚠️ SMS_ENABLED=false. Running in MOCK mode.');
      } else {
        this.logger.warn(
          '⚠️ Twilio credentials not found. Running in MOCK mode.',
        );
      }
    }
  }

  /**
   * Send SMS using Twilio or mock mode
   */
  async sendSms(params: {
    to: string;
    message: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, message } = params;

    // Normalize phone number for Vietnam (+84)
    const normalizedPhone = to.startsWith('+')
      ? to
      : `+84${to.replace(/^0/, '')}`;

    // Mock mode
    if (this.isMockMode) {
      this.logger.log(
        `[MOCK] SMS would be sent to ${normalizedPhone}: ${message.substring(0, 50)}...`,
      );
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    // Real Twilio integration
    try {
      const fromNumber = this.config.get('TWILIO_FROM_NUMBER');

      if (!fromNumber) {
        throw new Error('TWILIO_FROM_NUMBER not configured');
      }

      const result = await this.twilioClient!.messages.create({
        body: message,
        from: fromNumber,
        to: normalizedPhone,
      });

      this.logger.log(`✅ SMS sent to ${normalizedPhone}, SID: ${result.sid}`);

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to send SMS to ${normalizedPhone}: ${error.message}`,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendPaymentReminder(params: {
    to: string;
    customerName: string;
    dueDate: string;
    amount: number;
    periodNumber: number;
  }): Promise<{ success: boolean }> {
    const { to, customerName, dueDate, amount, periodNumber } = params;

    const message = `[Cầm đồ] Kính gửi ${customerName}, 
Khoản vay có kỳ thanh toán đến hạn vào ${dueDate}.
Số tiền: ${amount.toLocaleString('vi-VN')} VND (Kỳ ${periodNumber}).
Vui lòng thanh toán trước hạn. Xin cảm ơn!`;

    return this.sendSms({ to, message });
  }

  async sendOverdueNotification(params: {
    to: string;
    customerName: string;
    daysOverdue: number;
    amount: number;
    penalty: number;
  }): Promise<{ success: boolean }> {
    const { to, customerName, daysOverdue, amount, penalty } = params;

    const message = `[Cầm đồ - QUÁ HẠN] Kính gửi ${customerName},
Kỳ thanh toán đã quá hạn ${daysOverdue} ngày.
Gốc: ${amount.toLocaleString('vi-VN')} VND
Phạt: ${penalty.toLocaleString('vi-VN')} VND
Vui lòng liên hệ ngay!`;

    return this.sendSms({ to, message });
  }

  async sendLoanApprovalSms(params: {
    to: string;
    customerName: string;
    loanAmount: number;
    firstPaymentDate: string;
    firstPaymentAmount: number;
  }): Promise<{ success: boolean }> {
    const {
      to,
      customerName,
      loanAmount,
      firstPaymentDate,
      firstPaymentAmount,
    } = params;

    const message = `[Cầm đồ] Xin chào ${customerName}!
Khoản vay của bạn đã được duyệt.
Số tiền: ${loanAmount.toLocaleString('vi-VN')} VND
Kỳ đầu tiên: ${firstPaymentDate} - ${firstPaymentAmount.toLocaleString('vi-VN')} VND
Cảm ơn bạn!`;

    return this.sendSms({ to, message });
  }

  async sendPaymentConfirmationSms(params: {
    to: string;
    customerName: string;
    paymentId: string;
    amount: number;
  }): Promise<{ success: boolean }> {
    const { to, customerName, paymentId, amount } = params;

    const message = `[Cầm đồ] Xin chào ${customerName}!
Thanh toán thành công!
Mã GD: ${paymentId}
Số tiền: ${amount.toLocaleString('vi-VN')} VND
Cảm ơn bạn!`;

    return this.sendSms({ to, message });
  }
}
