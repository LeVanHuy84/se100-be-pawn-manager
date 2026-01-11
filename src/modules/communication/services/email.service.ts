import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASSWORD'),
      },
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, text, html } = params;

    try {
      const info = await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', '"Cầm Đồ Shop" <noreply@shop.com>'),
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Email sent to ${to}: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
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

    const subject = 'Nhắc nhở thanh toán - Cầm Đồ Shop';
    const text = `Kính gửi ${customerName},

Khoản vay của quý khách có kỳ thanh toán đến hạn vào ${dueDate}.

Thông tin chi tiết:
- Kỳ thanh toán: ${periodNumber}
- Số tiền cần thanh toán: ${amount.toLocaleString('vi-VN')} VND
- Ngày đến hạn: ${dueDate}

Vui lòng đến cửa hàng hoặc chuyển khoản trước ngày đến hạn để tránh phí phạt.

Trân trọng,
Cầm Đồ Shop`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Nhắc nhở thanh toán</h2>
        <p>Kính gửi <strong>${customerName}</strong>,</p>
        <p>Khoản vay của quý khách có kỳ thanh toán đến hạn vào <strong>${dueDate}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Thông tin chi tiết:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>📋 <strong>Kỳ thanh toán:</strong> ${periodNumber}</li>
            <li>💰 <strong>Số tiền:</strong> ${amount.toLocaleString('vi-VN')} VND</li>
            <li>📅 <strong>Ngày đến hạn:</strong> ${dueDate}</li>
          </ul>
        </div>

        <p style="color: #e74c3c;">Vui lòng thanh toán trước ngày đến hạn để tránh phí phạt.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Đây là email tự động, vui lòng không reply.<br>
          Nếu có thắc mắc, vui lòng liên hệ cửa hàng trực tiếp.
        </p>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }

  async sendOverdueNotification(params: {
    to: string;
    customerName: string;
    daysOverdue: number;
    amount: number;
    penalty: number;
  }): Promise<{ success: boolean }> {
    const { to, customerName, daysOverdue, amount, penalty } = params;

    const subject = '⚠️ Thông báo thanh toán quá hạn - Cầm Đồ Shop';
    const text = `Kính gửi ${customerName},

Kỳ thanh toán của quý khách đã quá hạn ${daysOverdue} ngày.

Thông tin:
- Số tiền gốc: ${amount.toLocaleString('vi-VN')} VND
- Phí phạt hiện tại: ${penalty.toLocaleString('vi-VN')} VND

Vui lòng liên hệ cửa hàng ngay để thanh toán và tránh các biện pháp xử lý theo quy định.

Trân trọng,
Cầm Đồ Shop`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e74c3c; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
          <h2 style="margin: 0;">⚠️ Thông báo thanh toán quá hạn</h2>
        </div>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <p>Kính gửi <strong>${customerName}</strong>,</p>
          <p>Kỳ thanh toán của quý khách đã <strong style="color: #e74c3c;">quá hạn ${daysOverdue} ngày</strong>.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">Thông tin:</h3>
            <ul style="list-style: none; padding: 0;">
              <li>💰 <strong>Số tiền gốc:</strong> ${amount.toLocaleString('vi-VN')} VND</li>
              <li>⚠️ <strong>Phí phạt hiện tại:</strong> ${penalty.toLocaleString('vi-VN')} VND</li>
            </ul>
          </div>

          <p style="color: #e74c3c; font-weight: bold;">
            Vui lòng liên hệ cửa hàng ngay để thanh toán và tránh các biện pháp xử lý theo quy định.
          </p>
        </div>

        <div style="background-color: #f8f9fa; padding: 15px; text-align: center;">
          <p style="color: #7f8c8d; font-size: 12px; margin: 0;">
            Đây là email tự động, vui lòng không reply.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({ to, subject, text, html });
  }
}
