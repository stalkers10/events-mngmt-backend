import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { sendOtpEmail } from '../config/mailer';
import { query } from '../config/db';
import { RoleType, AuthenticatedUser } from '../types/auth';

// NOTE: Gate Staff accounts live in the `users` table (see migrations/).
// The Admin OTP flow above does not touch this table since Admin is a
// single hardcoded account per the spec.

interface PendingOtp {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

// Single pending OTP at a time is sufficient: only one hardcoded Admin account exists.
let pendingAdminOtp: PendingOtp | null = null;

function generateOtpCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

function issueToken(user: AuthenticatedUser): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(user, env.jwtSecret, options);
}

export const AuthService = {
  /**
   * Step 1 of Admin login: verify hardcoded credentials, then generate
   * and email an OTP. Does NOT issue a JWT yet.
   */
  async loginAdminStep1(username: string, password: string): Promise<{ otpSent: true }> {
    if (username !== env.adminUsername || password !== env.adminPassword) {
      throw new AuthError('Invalid username or password', 401);
    }

    const code = generateOtpCode(env.otpLength);
    pendingAdminOtp = {
      code,
      expiresAt: Date.now() + env.otpExpiryMinutes * 60 * 1000,
      attemptsRemaining: env.otpMaxAttempts,
    };

    await sendOtpEmail(code);
    return { otpSent: true };
  },

  /**
   * Step 2 of Admin login: verify the OTP code and issue a JWT.
   */
  async verifyAdminOtp(code: string): Promise<{ token: string }> {
    if (!pendingAdminOtp) {
      throw new AuthError('No pending verification. Please log in again.', 400);
    }

    if (Date.now() > pendingAdminOtp.expiresAt) {
      pendingAdminOtp = null;
      throw new AuthError('Invalid or expired code', 400);
    }

    if (pendingAdminOtp.attemptsRemaining <= 0) {
      pendingAdminOtp = null;
      throw new AuthError('Too many failed attempts. Please log in again.', 429);
    }

    if (code.toUpperCase() !== pendingAdminOtp.code) {
      pendingAdminOtp.attemptsRemaining -= 1;
      throw new AuthError('Invalid or expired code', 400);
    }

    pendingAdminOtp = null;

    const user: AuthenticatedUser = {
      id: 'admin', // single hardcoded admin; replace with real id if Admin ever moves to DB
      username: env.adminUsername,
      role: RoleType.ADMIN,
    };
    return { token: issueToken(user) };
  },

  /**
   * Gate Staff login: no OTP step. Verifies against the User table
   * (Prisma) once implemented; stubbed here pending the schema.
   */
  async loginGateStaff(username: string, password: string): Promise<{ token: string }> {
    const staffUser = await findGateStaffByUsername(username);
    if (!staffUser || !staffUser.isActive) {
      throw new AuthError('Invalid username or password', 401);
    }

    const passwordMatches = await bcrypt.compare(password, staffUser.passwordHash);
    if (!passwordMatches) {
      throw new AuthError('Invalid username or password', 401);
    }

    const user: AuthenticatedUser = {
      id: staffUser.id,
      username: staffUser.username,
      role: RoleType.GATE_STAFF,
    };
    return { token: issueToken(user) };
  },
};

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ---- Real lookup against the users table ----
interface GateStaffRow {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
}

async function findGateStaffByUsername(username: string): Promise<{
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
} | null> {
  const result = await query<GateStaffRow>(
    `SELECT id, username, password_hash, is_active
     FROM users
     WHERE username = $1 AND role = 'GATE_STAFF'
     LIMIT 1`,
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    isActive: row.is_active,
  };
}
