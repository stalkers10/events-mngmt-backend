import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, AuthError } from '../services/auth.service';
import { env } from '../config/env';
import { rateLimit } from '../middlewares/rateLimit.middleware';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const otpSchema = z.object({
  code: z.string().length(8),
  // Required for Client Admin OTP step to identify which account to verify
  username: z.string().min(1).optional(),
});

/**
 * POST /auth/login
 *
 * Three-way branching:
 *  1. username === env.adminUsername  →  Super Admin OTP flow (step 1)
 *  2. username found in users with CLIENT_ADMIN role  →  Client Admin OTP flow (step 1)
 *  3. otherwise  →  Gate Staff direct login (no OTP)
 *
 * Always returns { otpRequired: boolean } so the frontend knows whether to
 * show the OTP input. For Gate Staff the JWT is returned immediately.
 */
router.post(
  '/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const { username, password } = parsed.data;

    try {
      // 1. Super Admin
      if (username === env.adminUsername) {
        const result = await AuthService.loginSuperAdminStep1(username, password);
        return res.status(200).json({ otpRequired: true, ...result });
      }

      // 2. Try Client Admin
      try {
        const result = await AuthService.loginClientAdminStep1(username, password);
        // Return username so the frontend can pass it back in /verify-otp
        return res.status(200).json({ otpRequired: true, username, ...result });
      } catch (clientErr) {
        // If it's a real error (not "account not found"), surface it
        if (clientErr instanceof AuthError && clientErr.statusCode !== 401) {
          throw clientErr;
        }
        // Otherwise fall through to Gate Staff
      }

      // 3. Gate Staff
      const result = await AuthService.loginGateStaff(username, password);
      return res.status(200).json({ otpRequired: false, ...result });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /auth/verify-otp
 *
 * Second step for both Super Admin and Client Admin logins.
 * - Super Admin: no `username` field needed (only one SA account).
 * - Client Admin: must include `username` to identify which pending OTP to verify.
 */
router.post(
  '/verify-otp',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req: Request, res: Response) => {
    const parsed = otpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'A valid 8-character code is required' });
    }

    try {
      const { code, username } = parsed.data;

      // No username → must be Super Admin
      if (!username || username === env.adminUsername) {
        const result = await AuthService.verifySuperAdminOtp(code);
        return res.status(200).json(result);
      }

      // Has username → Client Admin
      const result = await AuthService.verifyClientAdminOtp(username, code);
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('OTP verification error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
