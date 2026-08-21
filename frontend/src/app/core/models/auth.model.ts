export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CLIENT_ADMIN = 'CLIENT_ADMIN',
  GATE_STAFF = 'GATE_STAFF',
  ADMIN = 'ADMIN', // Keeping for backwards compatibility during transition if needed
}

export interface LoginResponse {
  otpRequired: boolean;
  token?: string;
  username?: string;  // For CLIENT_ADMIN OTP flow
}

export interface VerifyOtpResponse {
  token: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
  email: string;
  phone?: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
  name: string;
  email: string;
  plan: string;
}

export interface DecodedToken {
  id: string;
  username: string;
  role: RoleType;
  clientId?: string;
  iat: number;
  exp: number;
}
