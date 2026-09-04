import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const mailer = nodemailer.createTransport({
  host: env.smtpHost || 'smtp-relay.brevo.com',
  port: env.smtpPort || 587,
  secure: env.smtpPort === 465,
  connectionTimeout: 10000, // 10 seconds timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: (env.smtpUser && env.smtpPassword)
    ? {
        user: env.smtpUser,
        pass: env.smtpPassword,
      }
    : undefined,
});

/**
 * Send an OTP verification email.
 * @param code   The OTP code to include in the email.
 * @param toEmail  Recipient address. Defaults to the hardcoded Super Admin email.
 * @param recipientName Optional display name shown in the email body.
 */
export async function sendOtpEmail(
  code: string,
  toEmail: string = env.adminOtpEmail,
  recipientName?: string,
): Promise<void> {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
  
  // Log OTP to server output so admins can always retrieve it from Render logs
  console.log(`[OTP] Generated verification code for ${toEmail}: ${code}`);

  if (!env.smtpUser || !env.smtpPassword) {
    console.warn(`[OTP] SMTP_USER or SMTP_PASSWORD is missing in environment variables. Skipped sending email.`);
    return;
  }

  try {
    await mailer.sendMail({
      from: env.smtpFrom,
      to: toEmail,
      subject: 'Your Elite Events verification code',
      text: `${greeting}\n\nYour verification code is: ${code}\n\nThis code expires in ${env.otpExpiryMinutes} minutes.`,
      html: `
        <p>${greeting}</p>
        <p>Your Elite Events verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code expires in ${env.otpExpiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
      `,
    });
    console.log(`[OTP] Email successfully sent to ${toEmail}`);
  } catch (err: any) {
    console.error(`[OTP] Failed to send email via SMTP to ${toEmail}:`, err.message || err);
    // Gracefully continue so user can still complete login using the logged OTP code
  }
}
