import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUser, RoleType } from '../types/auth';

/**
 * Verifies the JWT on the Authorization header and attaches the decoded
 * user to req.user. Rejects the request if the token is missing/invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to one or more roles. Must run AFTER requireAuth.
 * This is the enforcement point discussed in the spec: hiding UI buttons
 * is not enough, the API must reject unauthorized roles independently.
 */
export function requireRole(...allowedRoles: RoleType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' });
      return;
    }
    next();
  };
}
