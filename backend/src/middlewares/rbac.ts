import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../core/errors';
import { ROLE_PERMISSIONS, type PermissionKey } from '../core/permissions';

export function requirePermission(permission: PermissionKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    const allowed = role ? (ROLE_PERMISSIONS[role] ?? []).includes(permission) : false;
    if (!allowed) return next(forbidden());
    next();
  };
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== 'admin') return next(forbidden('Admin access required'));
  next();
}
