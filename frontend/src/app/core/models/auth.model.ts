export enum RoleType {
  ADMIN = 'ADMIN',
  GATE_STAFF = 'GATE_STAFF',
}

export interface LoginResponse {
  otpRequired: boolean;
  token?: string;
}

export interface VerifyOtpResponse {
  token: string;
}

export interface DecodedToken {
  id: string;
  username: string;
  role: RoleType;
  iat: number;
  exp: number;
}
