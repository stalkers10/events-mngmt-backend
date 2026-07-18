export enum RoleType {
  ADMIN = 'ADMIN',
  GATE_STAFF = 'GATE_STAFF',
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: RoleType;
}

// Augment Express's Request type so req.user is typed after auth middleware runs
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
