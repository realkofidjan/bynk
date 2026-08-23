import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// SMTP transporter (Gmail/Outlook/custom SMTP)
const smtpTransporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export type BalanceEmailParams = {
  toEmail: string;
  clientName: string;
  categoryLabel: string;
  tierName: string;
  shootDate: string; // e.g. "Sat, Sep 20, 2026"
  timeSlotLabel: string; // e.g. "Morning (8 AM – 12 PM)"
  remainingBalanceGhs: number;
  paystackAuthorizationUrl: string;
};

/**
 * Send balance payment email to client with Paystack authorization URL.
 * Works with Nodemailer (SMTP/Gmail) or Resend API.
 */
export async function sendBalancePaymentEmail({
  toEmail,
  clientName,
  categoryLabel,
  tierName,
  shootDate,
  timeSlotLabel,
  remainingBalanceGhs,
  paystackAuthorizationUrl,
}: BalanceEmailParams) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background-color: #050505; color: #f5f5f5; margin: 0; padding: 40px 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #0a0a0a; border: 1px solid #262626; padding: 32px; }
          .header { text-transform: uppercase; font-size: 10px; letter-spacing: 3px; color: #888; margin-bottom: 8px; }
          .title { font-family: Georgia, serif; font-size: 24px; color: #fff; margin: 0 0 24px 0; }
          .divider { height: 1px; background: #262626; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; }
          .label { color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .value { color: #fff; font-weight: 500; }
          .amount-box { background: #141414; border: 1px solid #333; padding: 16px; margin: 24px 0; text-align: center; }
          .amount-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 4px; }
          .amount-value { font-family: Georgia, serif; font-size: 28px; color: #fff; font-weight: bold; }
          .button { display: block; width: 100%; background: #ffffff; color: #050505; text-align: center; padding: 14px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; font-weight: bold; text-decoration: none; margin-top: 24px; }
          .footer { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; text-align: center; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">BYNK Photography · Upcoming Shoot</div>
          <h1 class="title">Complete Remaining Balance</h1>
          
          <p style="font-size: 12px; color: #ccc; line-height: 1.6;">
            Hi ${clientName}, your photography session is scheduled for <strong>${shootDate}</strong> (${timeSlotLabel}). Please complete your remaining balance before the shoot date.
          </p>

          <div class="divider"></div>

          <div class="detail-row">
            <span class="label">Session</span>
            <span class="value">${categoryLabel} — ${tierName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Shoot Date</span>
            <span class="value">${shootDate}</span>
          </div>
          <div class="detail-row">
            <span class="label">Time Slot</span>
            <span class="value">${timeSlotLabel}</span>
          </div>

          <div class="amount-box">
            <div class="amount-label">Remaining Balance Due</div>
            <div class="amount-value">GHS ${remainingBalanceGhs.toLocaleString()}</div>
          </div>

          <a href="${paystackAuthorizationUrl}" class="button">Pay GHS ${remainingBalanceGhs.toLocaleString()} via Paystack</a>

          <div class="footer">
            Secured by Paystack · BYNK Photography Ghana
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Try Nodemailer SMTP if configured
  if (smtpTransporter) {
    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      await smtpTransporter.sendMail({
        from: `BYNK Photography <${fromEmail}>`,
        to: toEmail,
        subject: `Upcoming Shoot Payment Reminder — BYNK Photography (${shootDate})`,
        html,
      });

      return { success: true, provider: 'smtp' };
    } catch (err: any) {
      console.error('Nodemailer SMTP error:', err);
    }
  }

  // 2. Try Resend if configured
  if (resend) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'BYNK Photography <onboarding@resend.dev>';
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [toEmail],
        subject: `Upcoming Shoot Payment Reminder — BYNK Photography (${shootDate})`,
        html,
      });

      if (error) {
        console.error('Resend email error:', error);
        return {
          success: false,
          error: error.message || 'Resend domain error. To send to external domains without a custom domain, configure Gmail SMTP (SMTP_USER & SMTP_PASS) in .env.local',
        };
      }

      return { success: true, provider: 'resend', emailId: data?.id };
    } catch (err: any) {
      console.error('Resend exception:', err);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback: Log to console if neither is configured
  console.warn('Neither SMTP nor Resend is configured. Logged to console:');
  console.log({ to: toEmail, clientName, remainingBalanceGhs, paystackAuthorizationUrl });
  return { success: true, simulated: true };
}
