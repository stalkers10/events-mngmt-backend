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

// Fallback transport using Port 465 SSL (less likely to be blocked by cloud hosts than 587)
const mailerPort465 = nodemailer.createTransport({
  host: env.smtpHost || 'smtp-relay.brevo.com',
  port: 465,
  secure: true,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: (env.smtpUser && env.smtpPassword)
    ? {
        user: env.smtpUser,
        pass: env.smtpPassword,
      }
    : undefined,
});

function parseSender(fromStr: string) {
  const match = fromStr.match(/^(.*)<(.*)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: 'Elite Events', email: fromStr.trim() };
}

async function tryBrevoApi(toEmail: string, subject: string, text: string, html: string): Promise<boolean> {
  const apiKey = env.smtpPassword;
  if (!apiKey || !apiKey.startsWith('xkeysib-')) {
    return false;
  }

  const sender = parseSender(env.smtpFrom);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo REST API HTTP ${response.status}: ${errText}`);
  }

  return true;
}

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
  const subject = 'Your Elite Events verification code';
  const text = `${greeting}\n\nYour verification code is: ${code}\n\nThis code expires in ${env.otpExpiryMinutes} minutes.`;
  const html = `
    <p>${greeting}</p>
    <p>Your Elite Events verification code is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
    <p>This code expires in ${env.otpExpiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
  `;
  
  // Always log OTP to server output so admins can retrieve it from Render logs
  console.log(`[OTP] Generated verification code for ${toEmail}: ${code}`);

  if (!env.smtpUser && !env.smtpPassword) {
    console.warn(`[OTP] SMTP_USER / SMTP_PASSWORD is missing in environment variables. Skipped sending email.`);
    return;
  }

  // 1. Try Brevo HTTPS REST API first if password is a Brevo API key (xkeysib-...)
  try {
    const sentViaApi = await tryBrevoApi(toEmail, subject, text, html);
    if (sentViaApi) {
      console.log(`[OTP] Email successfully sent to ${toEmail} via Brevo HTTPS API`);
      return;
    }
  } catch (apiErr: any) {
    console.warn(`[OTP] Brevo HTTPS API failed, falling back to SMTP:`, apiErr.message || apiErr);
  }

  // 2. Try configured SMTP transport (e.g. port 587)
  try {
    await mailer.sendMail({
      from: env.smtpFrom,
      to: toEmail,
      subject,
      text,
      html,
    });
    console.log(`[OTP] Email successfully sent to ${toEmail} via SMTP`);
    return;
  } catch (smtpErr: any) {
    console.warn(`[OTP] Primary SMTP failed (${smtpErr.message || smtpErr}), trying Port 465 SSL fallback...`);
  }

  // 3. Fallback: Try Port 465 SSL
  try {
    await mailerPort465.sendMail({
      from: env.smtpFrom,
      to: toEmail,
      subject,
      text,
      html,
    });
    console.log(`[OTP] Email successfully sent to ${toEmail} via Port 465 SSL`);
  } catch (sslErr: any) {
    console.error(`[OTP] All email delivery methods failed for ${toEmail}:`, sslErr.message || sslErr);
    // Gracefully continue so user can still complete login using the logged OTP code
  }
}
