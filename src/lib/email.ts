import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type EmailDispatchOptions = {
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
};

export type EmailDispatchResult = {
  success: boolean;
  provider?: 'brevo' | 'smtp' | 'resend' | 'simulated';
  error?: string;
  messageId?: string;
  emailId?: string;
  simulated?: boolean;
};

/**
 * Universal Email Dispatcher:
 * 1. Brevo REST API (if BREVO_API_KEY is configured) — 300 free emails/day, zero setup
 * 2. Nodemailer SMTP (if SMTP_USER & SMTP_PASS configured, e.g. smtp-relay.brevo.com:587, Outlook, Gmail)
 * 3. Resend API (if RESEND_API_KEY is configured)
 * 4. Fallback (console simulation)
 */
export async function sendEmail({
  toEmail,
  toName,
  subject,
  html,
}: EmailDispatchOptions): Promise<EmailDispatchResult> {
  // 1. Brevo REST API (Fastest & most reliable)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && !brevoApiKey.includes('your_') && brevoApiKey.trim().length > 10) {
    try {
      const senderEmail =
        process.env.BREVO_SENDER_EMAIL ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        'bynkphotography@gmail.com';
      const senderName = process.env.BREVO_SENDER_NAME || 'BYNK Photography';

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: toEmail, name: toName || toEmail }],
          subject,
          htmlContent: html,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Brevo API error response:', resData);
        return {
          success: false,
          error: `Brevo Error: ${resData.message || resData.error || res.statusText}`,
        };
      }

      return {
        success: true,
        provider: 'brevo',
        messageId: resData.messageId,
      };
    } catch (err: any) {
      console.error('Brevo API exception:', err);
      return {
        success: false,
        error: `Brevo Exception: ${err.message}`,
      };
    }
  }

  // 2. Nodemailer SMTP (Works with Brevo SMTP smtp-relay.brevo.com, Outlook, Gmail)
  const hasRealSmtpPass =
    process.env.SMTP_PASS &&
    !process.env.SMTP_PASS.includes('your_') &&
    process.env.SMTP_PASS !== 'xxxx xxxx xxxx xxxx';

  if (process.env.SMTP_USER && hasRealSmtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      const info = await transporter.sendMail({
        from: `BYNK Photography <${fromEmail}>`,
        to: toName ? `"${toName}" <${toEmail}>` : toEmail,
        subject,
        html,
      });

      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      console.error('Nodemailer SMTP error:', err);
      return {
        success: false,
        error: `SMTP Error: ${err.message || 'Authentication failed'}`,
      };
    }
  }

  // 3. Resend API
  if (resend) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'BYNK Photography <onboarding@resend.dev>';
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [toEmail],
        subject,
        html,
      });

      if (error) {
        console.error('Resend email error:', error);
        return {
          success: false,
          error: error.message || 'Resend domain error.',
        };
      }

      return { success: true, provider: 'resend', emailId: data?.id };
    } catch (err: any) {
      console.error('Resend exception:', err);
      return { success: false, error: err.message };
    }
  }

  // 4. Fallback: Log to console in development
  console.warn('Neither Brevo, SMTP, nor Resend is configured. Logged email to console:');
  console.log({ to: toEmail, toName, subject });
  return { success: true, provider: 'simulated', simulated: true };
}

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

  return await sendEmail({
    toEmail,
    toName: clientName,
    subject: `Upcoming Shoot Payment Reminder — BYNK Photography (${shootDate})`,
    html,
  });
}

export type CustomOrderEmailParams = {
  toEmail: string;
  clientName: string;
  categoryLabel: string;
  packageName: string;
  shootDate: string; // e.g. "Sat, Sep 20, 2026"
  timeSlotLabel: string; // e.g. "14:00 – 17:00"
  totalAmountGhs: number;
  depositAmountGhs: number;
  remainingBalanceGhs: number;
  paystackAuthorizationUrl?: string;
  invoiceUrl?: string;
  notes?: string;
  addOns?: string[];
};

/**
 * Send custom order / booking proposal email to client with Paystack authorization URL.
 */
export async function sendCustomOrderEmail({
  toEmail,
  clientName,
  categoryLabel,
  packageName,
  shootDate,
  timeSlotLabel,
  totalAmountGhs,
  depositAmountGhs,
  remainingBalanceGhs,
  paystackAuthorizationUrl,
  invoiceUrl,
  notes,
  addOns = [],
}: CustomOrderEmailParams) {
  const isFullyPaid = depositAmountGhs >= totalAmountGhs || remainingBalanceGhs <= 0;
  const isDeposit = depositAmountGhs > 0 && !isFullyPaid;
  const chargeAmount = isFullyPaid ? totalAmountGhs : isDeposit ? depositAmountGhs : 0;

  const addOnsHtml = addOns.length > 0
    ? `<div class="detail-row"><span class="label">Included Add-ons</span><span class="value">${addOns.join(', ')}</span></div>`
    : '';

  const notesHtml = notes
    ? `<div class="notes-box"><div class="label" style="margin-bottom:6px;">Session Deliverables & Notes</div><div style="font-size:11px;color:#ddd;line-height:1.5;">${notes}</div></div>`
    : '';

  const payButtonHtml = paystackAuthorizationUrl
    ? `<a href="${paystackAuthorizationUrl}" class="button">Pay GHS ${chargeAmount.toLocaleString()} via Paystack</a>`
    : invoiceUrl
      ? `<a href="${invoiceUrl}" class="button" style="background:#222;color:#fff;border:1px solid #444;">View Booking Confirmation</a>`
      : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background-color: #050505; color: #f5f5f5; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #262626; padding: 36px; }
          .header { text-transform: uppercase; font-size: 10px; letter-spacing: 3px; color: #888; margin-bottom: 8px; }
          .title { font-family: Georgia, serif; font-size: 24px; color: #fff; margin: 0 0 16px 0; }
          .divider { height: 1px; background: #262626; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; }
          .label { color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .value { color: #fff; font-weight: 500; text-align: right; }
          .amount-box { background: #141414; border: 1px solid #333; padding: 18px; margin: 24px 0; text-align: center; }
          .amount-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 4px; }
          .amount-value { font-family: Georgia, serif; font-size: 28px; color: #fff; font-weight: bold; }
          .amount-subtext { font-size: 10px; color: #888; margin-top: 4px; }
          .notes-box { background: #111; border: 1px dashed #333; padding: 14px; margin: 18px 0; }
          .button { display: block; width: 100%; background: #ffffff; color: #050505; text-align: center; padding: 14px 0; text-transform: uppercase; font-size: 11px; letter-spacing: 2px; font-weight: bold; text-decoration: none; margin-top: 24px; }
          .footer { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #555; text-align: center; margin-top: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">BYNK Photography · Custom Order</div>
          <h1 class="title">Bespoke Session Booking</h1>
          
          <p style="font-size: 12px; color: #ccc; line-height: 1.6;">
            Hi ${clientName}, a tailored photography session has been arranged for you by <strong>BYNK Photography</strong>. Please review the details below.
          </p>

          <div class="divider"></div>

          <div class="detail-row">
            <span class="label">Session Package</span>
            <span class="value">${packageName} (${categoryLabel})</span>
          </div>
          <div class="detail-row">
            <span class="label">Shoot Date</span>
            <span class="value">${shootDate}</span>
          </div>
          <div class="detail-row">
            <span class="label">Time / Schedule</span>
            <span class="value">${timeSlotLabel}</span>
          </div>
          ${addOnsHtml}
          ${notesHtml}

          <div class="divider"></div>

          <div class="detail-row">
            <span class="label">Total Session Fee</span>
            <span class="value">GHS ${totalAmountGhs.toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="label">Deposit Amount</span>
            <span class="value">GHS ${depositAmountGhs.toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="label">Remaining Balance</span>
            <span class="value">GHS ${remainingBalanceGhs.toLocaleString()}</span>
          </div>

          <div class="amount-box">
            <div class="amount-label">${isFullyPaid ? 'Total Amount' : isDeposit ? 'Initial Deposit Due' : 'Total Amount'}</div>
            <div class="amount-value">GHS ${chargeAmount.toLocaleString()}</div>
            ${isDeposit ? `<div class="amount-subtext">Remaining GHS ${remainingBalanceGhs.toLocaleString()} due prior to shoot</div>` : ''}
          </div>

          ${payButtonHtml}

          <div class="footer">
            Secured by Paystack · BYNK Photography Ghana
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    toEmail,
    toName: clientName,
    subject: `Your Custom Photography Booking & Invoice — BYNK Photography`,
    html,
  });
}

export type BookingConfirmationEmailParams = {
  toEmail: string;
  clientName: string;
  bookingRef: string;
  categoryLabel: string;
  tierName: string;
  shootDate: string;
  timeSlotLabel: string;
  depositPaidGhs: number;
  totalPriceGhs: number;
  remainingBalanceGhs: number;
  lookupUrl?: string;
};

/**
 * Send automated booking confirmation email with reference and shoot details upon payment success.
 */
export async function sendBookingConfirmationEmail({
  toEmail,
  clientName,
  bookingRef,
  categoryLabel,
  tierName,
  shootDate,
  timeSlotLabel,
  depositPaidGhs,
  totalPriceGhs,
  remainingBalanceGhs,
  lookupUrl,
}: BookingConfirmationEmailParams) {
  const portalUrl = lookupUrl || 'https://bynkphotography.com/book/lookup';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background-color: #050505; color: #f5f5f5; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #262626; padding: 36px; border-radius: 4px; }
          .header { text-transform: uppercase; font-size: 10px; letter-spacing: 3px; color: #888; margin-bottom: 8px; }
          .title { font-family: Georgia, serif; font-size: 26px; color: #fff; margin: 0 0 8px 0; font-weight: normal; }
          .subtitle { font-size: 13px; color: #a3a3a3; line-height: 1.5; margin-bottom: 24px; }
          .badge { display: inline-block; background: #16a34a20; border: 1px solid #16a34a50; color: #4ade80; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 20px; }
          .divider { height: 1px; background: #262626; margin: 24px 0; }
          .ref-box { background: #141414; border: 1px solid #333; padding: 16px; margin: 20px 0; text-align: center; border-radius: 4px; }
          .ref-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 4px; }
          .ref-value { font-family: monospace; font-size: 18px; color: #fff; font-weight: bold; letter-spacing: 2px; }
          .detail-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 12px; }
          .label { color: #888; text-transform: uppercase; letter-spacing: 1px; }
          .value { color: #fff; font-weight: 500; }
          .amount-row { display: flex; justify-content: space-between; font-size: 13px; padding: 8px 0; border-top: 1px solid #1f1f1f; }
          .button { display: inline-block; background: #fff; color: #000; text-decoration: none; padding: 14px 28px; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; text-align: center; border-radius: 2px; margin-top: 24px; }
          .footer { margin-top: 36px; font-size: 11px; color: #666; text-align: center; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">BYNK Photography · Booking Confirmed</div>
          <h1 class="title">Shoot Confirmed</h1>
          <div class="badge">Deposit Paid · Reserved</div>
          <p class="subtitle">Dear ${clientName}, your shoot has been successfully confirmed. We look forward to working with you.</p>

          <div class="ref-box">
            <div class="ref-label">Your Booking Reference</div>
            <div class="ref-value">${bookingRef}</div>
          </div>

          <div class="divider"></div>

          <div class="detail-row">
            <span class="label">Session</span>
            <span class="value">${categoryLabel} — ${tierName}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date</span>
            <span class="value">${shootDate}</span>
          </div>
          <div class="detail-row">
            <span class="label">Time</span>
            <span class="value">${timeSlotLabel}</span>
          </div>

          <div class="divider"></div>

          <div class="amount-row">
            <span class="label">Total Price:</span>
            <span class="value">GHS ${totalPriceGhs.toLocaleString()}</span>
          </div>
          <div class="amount-row">
            <span class="label">Deposit Paid:</span>
            <span class="value" style="color: #4ade80;">GHS ${depositPaidGhs.toLocaleString()}</span>
          </div>
          <div class="amount-row" style="border-top: 1px solid #333; font-weight: bold;">
            <span class="label" style="color: #fff;">Remaining Balance:</span>
            <span class="value" style="color: #fbbf24;">GHS ${remainingBalanceGhs.toLocaleString()}</span>
          </div>

          <div style="text-align: center;">
            <a href="${portalUrl}" class="button">View Booking Details</a>
          </div>

          <div class="footer">
            <p>Save this email for your records. You can check your booking status anytime on our website using your email.</p>
            <p>Questions? Contact us at <a href="mailto:bynkphotography@gmail.com" style="color: #888;">bynkphotography@gmail.com</a> or WhatsApp +233 20 555 5084.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    toEmail,
    toName: clientName,
    subject: `Booking Confirmed (${shootDate}) — BYNK Photography [Ref: ${bookingRef}]`,
    html,
  });
}

export type ManualShootEmailParams = {
  toEmail: string;
  clientName: string;
  shootDate?: string;
  tierName?: string;
  categoryLabel?: string;
  subject: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
};

/**
 * Send custom branded admin email directly to client regarding their shoot.
 */
export async function sendManualShootEmail({
  toEmail,
  clientName,
  shootDate,
  tierName,
  categoryLabel,
  subject,
  message,
  actionUrl,
  actionText,
}: ManualShootEmailParams) {
  // Convert newlines in message to paragraphs/linebreaks
  const formattedMessage = message
    .split('\n\n')
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #ddd;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const shootInfoHtml = shootDate || tierName ? `
    <div style="background: #141414; border: 1px solid #262626; padding: 16px; margin: 24px 0;">
      <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 8px;">Session Overview</div>
      ${tierName ? `<div style="font-size: 13px; color: #fff; margin-bottom: 4px;"><strong>Package:</strong> ${tierName} ${categoryLabel ? `(${categoryLabel})` : ''}</div>` : ''}
      ${shootDate ? `<div style="font-size: 13px; color: #bbb;"><strong>Shoot Date:</strong> ${shootDate}</div>` : ''}
    </div>
  ` : '';

  const actionButtonHtml = actionUrl ? `
    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: #ffffff; color: #000000; text-decoration: none; padding: 12px 28px; font-weight: 600; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase;">
        ${actionText || 'View Details'}
      </a>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background-color: #050505; color: #f5f5f5; margin: 0; padding: 40px 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #0a0a0a; border: 1px solid #262626; padding: 36px; border-radius: 4px; }
          .header { text-transform: uppercase; font-size: 10px; letter-spacing: 3px; color: #888; margin-bottom: 8px; }
          .title { font-family: Georgia, serif; font-size: 24px; color: #fff; margin: 0 0 20px 0; font-weight: normal; }
          .divider { height: 1px; background: #262626; margin: 24px 0; }
          .footer { margin-top: 32px; border-top: 1px solid #222; padding-top: 20px; font-size: 11px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">BYNK Photography</div>
          <h1 class="title">${subject}</h1>
          <p style="font-size: 13px; color: #a3a3a3; margin-bottom: 20px;">Dear ${clientName},</p>
          
          <div style="font-size: 13px;">
            ${formattedMessage}
          </div>

          ${shootInfoHtml}
          ${actionButtonHtml}

          <div class="footer">
            <p>BYNK Photography · Accra, Ghana</p>
            <p>For questions or assistance, reply to this email or WhatsApp +233 20 555 5084.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({
    toEmail,
    toName: clientName,
    subject: `${subject} — BYNK Photography`,
    html,
  });
}



