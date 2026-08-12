import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const mailer = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser
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
}
