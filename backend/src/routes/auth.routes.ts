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
});

/**
 * POST /auth/login
 * Single login endpoint for both roles. Branches based on which
 * username matches the hardcoded Admin username:
 *   - Admin username  -> validate password, send OTP, respond otpRequired: true
 *   - anything else   -> treated as Gate Staff, validate against DB, issue token directly
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
      if (username === env.adminUsername) {
        const result = await AuthService.loginAdminStep1(username, password);
        return res.status(200).json({ otpRequired: true, ...result });
      }

      const result = await AuthService.loginGateStaff(username, password);
      return res.status(200).json({ otpRequired: false, ...result });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /auth/verify-otp
 * Second step for Admin login only.
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
      const result = await AuthService.verifyAdminOtp(parsed.data.code);
      return res.status(200).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      console.error('OTP verification error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
