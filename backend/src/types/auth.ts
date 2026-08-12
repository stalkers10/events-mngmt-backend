export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  GATE_STAFF = 'GATE_STAFF',
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: RoleType;
  /**
   * Present only on CLIENT_ADMIN tokens.
   * Equals the user's own id (the client admin IS the tenant root).
   * Used by route guards to filter all DB queries to this tenant's data.
   */
  clientId?: string;
}

// Augment Express's Request type so req.user is typed after auth middleware runs
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
