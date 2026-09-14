export type UserRole = 'admin' | 'monitor' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
