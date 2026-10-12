import { z } from 'zod';
import { ROLES, type Role } from '../utils/constants';

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: emailSchema,
  // bcrypt only looks at the first 72 bytes, so longer passwords are rejected rather than silently cut.
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  role: z.enum(ROLES, 'Role must be brand or creator'),
});
export type SignupInput = z.output<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.output<typeof loginSchema>;

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}
