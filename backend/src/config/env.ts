import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  adminUsername: required('ADMIN_USERNAME'),
  adminPassword: required('ADMIN_PASSWORD'),

  otpLength: parseInt(process.env.OTP_LENGTH || '8', 10),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  adminOtpEmail: required('ADMIN_OTP_EMAIL'),

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || 'Elite Events <no-reply@elite-events.example.com>',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  localUrl: process.env.LOCAL_URL || 'http://localhost:4200',
  campay: {
    mode: process.env.CAMPAY_MODE || 'sandbox',
    appUsername: process.env.CAMPAY_APP_USERNAME || '',
    appPassword: process.env.CAMPAY_APP_PASSWORD || '',
    permanentAccessToken: process.env.CAMPAY_PERMANENT_ACCESS_TOKEN || '',
    webhookKey: process.env.CAMPAY_WEBHOOK_KEY || '',
  },
};
