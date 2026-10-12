import type { Request, RequestHandler } from 'express';
import type { Role } from './constants';
import { ForbiddenError, UnauthorizedError } from './exceptions';
import { verifyToken } from './security';

export interface AuthUser {
  id: string;
  role: Role;
}

// Lets every handler read `req.user` with full typing once requireAuth has run.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Reads the `Authorization: Bearer <token>` header and attaches the user to the request. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();
  const { userId, role } = verifyToken(header.slice('Bearer '.length).trim());
  req.user = { id: userId, role };
  next();
};

/** Must run after `requireAuth`. */
export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.role !== role) throw new ForbiddenError(`Only ${role} accounts can do this`);
    next();
  };
}

/** The logged-in user, for controllers behind `requireAuth`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
