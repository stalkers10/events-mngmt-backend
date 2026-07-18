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

export async function sendOtpEmail(code: string): Promise<void> {
  await mailer.sendMail({
    from: env.smtpFrom,
    to: env.adminOtpEmail,
    subject: 'Your Elite Events verification code',
    text: `Your verification code is: ${code}\n\nThis code expires in ${env.otpExpiryMinutes} minutes.`,
    html: `
      <p>Your Elite Events verification code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in ${env.otpExpiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}
