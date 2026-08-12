import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { sendOtpEmail } from '../config/mailer';
import { query } from '../config/db';
import { RoleType, AuthenticatedUser } from '../types/auth';

// ─── OTP helpers ────────────────────────────────────────────────────────────

interface PendingOtp {
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

/**
 * Keyed by username so multiple Client Admins can have concurrent pending OTPs.
 * The Super Admin slot uses env.adminUsername as its key.
 */
const pendingOtps = new Map<string, PendingOtp>();

function generateOtpCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

function storePendingOtp(username: string): string {
  const code = generateOtpCode(env.otpLength);
  pendingOtps.set(username, {
    code,
    expiresAt: Date.now() + env.otpExpiryMinutes * 60 * 1000,
    attemptsRemaining: env.otpMaxAttempts,
  });
  return code;
}

function verifyPendingOtp(username: string, submitted: string): void {
  const pending = pendingOtps.get(username);

  if (!pending) {
    throw new AuthError('No pending verification. Please log in again.', 400);
  }
  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(username);
    throw new AuthError('Invalid or expired code', 400);
  }
  if (pending.attemptsRemaining <= 0) {
    pendingOtps.delete(username);
    throw new AuthError('Too many failed attempts. Please log in again.', 429);
  }
  if (submitted.toUpperCase() !== pending.code) {
    pending.attemptsRemaining -= 1;
    throw new AuthError('Invalid or expired code', 400);
  }

  pendingOtps.delete(username);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

function issueToken(user: AuthenticatedUser): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(user, env.jwtSecret, options);
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const AuthService = {
  // ── Super Admin (hardcoded credentials, OTP to env email) ──────────────────

  /**
   * Step 1 of Super Admin login: verify hardcoded credentials, generate and
   * email an OTP to the configured admin address. Does NOT issue a JWT yet.
   */
  async loginSuperAdminStep1(username: string, password: string): Promise<{ otpSent: true }> {
    if (username !== env.adminUsername || password !== env.adminPassword) {
      throw new AuthError('Invalid username or password', 401);
    }

    const code = storePendingOtp(username);
    await sendOtpEmail(code, env.adminOtpEmail);
    return { otpSent: true };
  },

  /**
   * Step 2 of Super Admin login: verify OTP, issue SUPER_ADMIN JWT.
   */
  async verifySuperAdminOtp(code: string): Promise<{ token: string; role: RoleType }> {
    verifyPendingOtp(env.adminUsername, code);

    const user: AuthenticatedUser = {
      id: 'super-admin',
      username: env.adminUsername,
      role: RoleType.SUPER_ADMIN,
    };
    return { token: issueToken(user), role: RoleType.SUPER_ADMIN };
  },

  // ── Client Admin (DB-stored, OTP to their own email) ──────────────────────

  /**
   * Step 1 of Client Admin login: verify credentials against DB, generate and
   * email an OTP to the client's registered email. Does NOT issue JWT yet.
   */
  async loginClientAdminStep1(username: string, password: string): Promise<{ otpSent: true }> {
    const client = await findUserByUsernameAndRole(username, RoleType.CLIENT_ADMIN);
    if (!client || !client.isActive) {
      throw new AuthError('Invalid username or password', 401);
    }

    const passwordMatches = await bcrypt.compare(password, client.passwordHash);
    if (!passwordMatches) {
      throw new AuthError('Invalid username or password', 401);
    }
    if (!client.email) {
      throw new AuthError('Account has no email address configured. Contact the Super Admin.', 400);
    }

    const code = storePendingOtp(username);
    await sendOtpEmail(code, client.email, client.name ?? client.username);
    return { otpSent: true };
  },

  /**
   * Step 2 of Client Admin login: verify OTP, issue CLIENT_ADMIN JWT with
   * clientId = the user's own id (tenant root).
   */
  async verifyClientAdminOtp(username: string, code: string): Promise<{ token: string; role: RoleType }> {
    verifyPendingOtp(username, code);

    const client = await findUserByUsernameAndRole(username, RoleType.CLIENT_ADMIN);
    if (!client) {
      throw new AuthError('Account not found', 404);
    }

    const user: AuthenticatedUser = {
      id: client.id,
      username: client.username,
      role: RoleType.CLIENT_ADMIN,
      clientId: client.id, // client admin IS the tenant root
    };
    return { token: issueToken(user), role: RoleType.CLIENT_ADMIN };
  },

  // ── Gate Staff (DB-stored, no OTP) ────────────────────────────────────────

  async loginGateStaff(username: string, password: string): Promise<{ token: string; role: RoleType }> {
    const staffUser = await findUserByUsernameAndRole(username, RoleType.GATE_STAFF);
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
    return { token: issueToken(user), role: RoleType.GATE_STAFF };
  },
};

// ─── AuthError ────────────────────────────────────────────────────────────────

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
  name: string | null;
  email: string | null;
}

async function findUserByUsernameAndRole(
  username: string,
  role: RoleType,
): Promise<{
  id: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  name: string | null;
  email: string | null;
} | null> {
  const result = await query<UserRow>(
    `SELECT id, username, password_hash, is_active, name, email
     FROM users
     WHERE username = $1 AND role = $2
     LIMIT 1`,
    [username, role],
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    name: row.name,
    email: row.email,
  };
}
