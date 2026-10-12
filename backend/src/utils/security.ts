import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from './config';
import { ErrorCode, ROLES, type Role } from './constants';
import { UnauthorizedError } from './exceptions';

const BCRYPT_ROUNDS = 10;

export interface TokenPayload {
  userId: string;
  role: Role;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken({ userId, role }: TokenPayload): string {
  return jwt.sign({ role }, config.JWT_SECRET, {
    subject: userId,
    expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET);
  } catch {
    throw new UnauthorizedError('Your session is invalid or has expired; please log in again', ErrorCode.INVALID_TOKEN);
  }
  const role = typeof decoded === 'object' ? decoded.role : undefined;
  if (typeof decoded !== 'object' || !decoded.sub || !ROLES.includes(role)) {
    throw new UnauthorizedError('Your session is invalid; please log in again', ErrorCode.INVALID_TOKEN);
  }
  return { userId: decoded.sub, role };
}
