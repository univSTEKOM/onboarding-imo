import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
}

export interface IAuthRequest extends Request {
  user: AuthenticatedUser;
}
