export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export const validationError = (m: string, d?: unknown) => new AppError('VALIDATION_ERROR', m, d);
export const unauthenticated = (m = 'Authentication required') => new AppError('UNAUTHENTICATED', m);
export const forbidden = (m = 'You do not have permission to perform this action') => new AppError('FORBIDDEN', m);
export const notFound = (m = 'Resource not found') => new AppError('NOT_FOUND', m);
export const conflict = (m: string) => new AppError('CONFLICT', m);
