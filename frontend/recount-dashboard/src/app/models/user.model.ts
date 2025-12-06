export type UserRole = 'super_admin' | 'reviewer' | 'viewer';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}