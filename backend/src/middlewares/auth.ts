import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { unauthenticated } from '../core/errors';
import type { UserRole } from '../models/user.model';

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(userId: string, role: UserRole, secret: string, ttl: string): string {
  return jwt.sign({ sub: userId, role }, secret, { expiresIn: ttl as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const payload = jwt.verify(token, secret) as AccessTokenPayload;
  if (!payload?.sub || !payload?.role) throw unauthenticated('Invalid token payload');
  if (!Types.ObjectId.isValid(payload.sub)) throw unauthenticated('Invalid token subject');
  return payload;
}

export function requireAuth(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) throw unauthenticated();
      const payload = verifyAccessToken(header.slice(7), secret);
      req.auth = { id: payload.sub, role: payload.role };
      next();
    } catch (err) {
      next(err instanceof Error && err.name === 'JsonWebTokenError' ? unauthenticated('Invalid token') : err);
    }
  };
}

export function optionalAuth(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    try {
      const payload = verifyAccessToken(header.slice(7), secret);
      req.auth = { id: payload.sub, role: payload.role };
    } catch {
      /* treat as anonymous */
    }
    next();
  };
}
