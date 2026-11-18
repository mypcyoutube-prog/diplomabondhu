import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { conflict, notFound as notFoundError, unauthenticated, validationError } from '../../core/errors';
import { RefreshToken, type IRefreshToken } from '../../models/refresh-token.model';
import { PasswordReset } from '../../models/password-reset.model';
import { User, type IUser } from '../../models/user.model';
import { writeAudit } from '../../models/audit-log.model';

export interface AuthEnv {
  accessSecret: string;
  refreshSecret: string;
  accessTokenTtl: string;
  refreshTokenTtlDays: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_ROUNDS = 12;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function refreshExpiry(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function publicUser(user: IUser) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    profile: user.profile,
    prefs: user.prefs,
    createdAt: user.createdAt
  };
}

async function issueTokens(user: IUser, env: AuthEnv, deviceInfo?: string): Promise<TokenPair> {
  const { signAccessToken } = await import('../../middlewares/auth');
  const accessToken = signAccessToken(String(user._id), user.role, env.accessSecret, env.accessTokenTtl);
  const refreshToken = generateRefreshToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    deviceInfo,
    expiresAt: refreshExpiry(env.refreshTokenTtlDays)
  });
  return { accessToken, refreshToken };
}

export async function register(input: { name: string; email: string; password: string; phone?: string }, env: AuthEnv, meta: { ip?: string; userAgent?: string }): Promise<{ user: IUser; tokens: TokenPair }> {
  const existing = await User.findOne({ email: input.email.toLowerCase() }).lean();
  if (existing) throw conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    phone: input.phone,
    role: 'student'
  });

  await writeAudit({ action: 'auth.register', targetType: 'User', targetId: String(user._id), after: { email: user.email }, ...meta });
  const tokens = await issueTokens(user, env, meta.userAgent);
  return { user, tokens };
}

export async function login(input: { email: string; password: string }, env: AuthEnv, meta: { ip?: string; userAgent?: string }): Promise<{ user: IUser; tokens: TokenPair }> {
  const user = await User.findOne({ email: input.email.toLowerCase(), deletedAt: null });
  if (!user) throw unauthenticated('Invalid email or password');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    await writeAudit({ action: 'auth.login_failed', targetType: 'User', targetId: String(user._id), ...meta });
    throw unauthenticated('Invalid email or password');
  }
  if (user.status === 'suspended') throw unauthenticated('This account is suspended. Contact support.');

  user.lastLoginAt = new Date();
  await user.save();
  await writeAudit({ action: 'auth.login', targetType: 'User', targetId: String(user._id), ...meta });
  const tokens = await issueTokens(user, env, meta.userAgent);
  return { user, tokens };
}

export async function rotateRefreshToken(rawToken: string, env: AuthEnv, meta: { ip?: string; userAgent?: string }): Promise<{ user: IUser; tokens: TokenPair }> {
  const tokenHash = sha256(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.expiresAt < new Date()) {
    throw unauthenticated('Invalid or expired refresh token');
  }

  if (stored.revokedAt) {
    await RefreshToken.updateMany({ userId: stored.userId, revokedAt: null }, { revokedAt: new Date() });
    await writeAudit({ action: 'auth.refresh_reuse_detected', targetType: 'User', targetId: String(stored.userId), ...meta });
    throw unauthenticated('Refresh token reuse detected. All sessions revoked.');
  }

  const user = await User.findOne({ _id: stored.userId, deletedAt: null });
  if (!user || user.status === 'suspended') throw unauthenticated('Account unavailable');

  const tokens = await issueTokens(user, env, meta.userAgent);
  const newHash = sha256(tokens.refreshToken);
  stored.revokedAt = new Date();
  stored.replacedByHash = newHash;
  await stored.save();
  return { user, tokens };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await RefreshToken.updateOne({ tokenHash: sha256(rawToken), revokedAt: null }, { revokedAt: new Date() });
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId: new Types.ObjectId(userId), revokedAt: null }, { revokedAt: new Date() });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string, env: AuthEnv): Promise<void> {
  const user = await User.findById(userId);
  if (!user) throw unauthenticated();
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw validationError('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  await revokeAllSessions(userId);
  await writeAudit({ action: 'auth.password_changed', targetType: 'User', targetId: userId });
}

export async function sessions_findUser(userId: string): Promise<IUser> {
  const user = await User.findOne({ _id: new Types.ObjectId(userId), deletedAt: null });
  if (!user) throw unauthenticated('Account not found');
  return user;
}

const PASSWORD_RESET_TTL_MINUTES = 30;

async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  await PasswordReset.create({
    userId: new Types.ObjectId(userId),
    tokenHash: sha256(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
  });
  return rawToken;
}

export async function requestPasswordReset(email: string, meta: { ip?: string; userAgent?: string }): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
  if (!user) return;
  const recent = await PasswordReset.findOne({
    userId: user._id,
    usedAt: { $exists: false },
    createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
  }).lean();
  if (recent) return;
  await createPasswordResetToken(String(user._id));
  await writeAudit({ action: 'auth.password_reset_requested', targetType: 'User', targetId: String(user._id), ...meta });
}

export async function resetPassword(rawToken: string, newPassword: string, meta: { ip?: string; userAgent?: string }): Promise<void> {
  const stored = await PasswordReset.findOne({ tokenHash: sha256(rawToken), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  if (!stored) throw validationError('Reset code is invalid or expired');
  const user = await User.findOne({ _id: stored.userId, deletedAt: null });
  if (!user) throw validationError('Reset code is invalid or expired');
  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  stored.usedAt = new Date();
  await stored.save();
  await revokeAllSessions(String(user._id));
  await writeAudit({ action: 'auth.password_reset_completed', targetType: 'User', targetId: String(user._id), ...meta });
}

export async function issuePasswordResetToken(actorId: string, userId: string): Promise<{ resetToken: string; expiresInMinutes: number }> {
  const user = await User.findOne({ _id: new Types.ObjectId(userId), deletedAt: null });
  if (!user) throw notFoundError('Student not found');
  await PasswordReset.updateMany({ userId: user._id, usedAt: { $exists: false } }, { $set: { usedAt: new Date() } });
  const resetToken = await createPasswordResetToken(userId);
  await writeAudit({ actorId, action: 'auth.password_reset_issued', targetType: 'User', targetId: userId });
  return { resetToken, expiresInMinutes: PASSWORD_RESET_TTL_MINUTES };
}

export async function listSessions(userId: string) {
  return RefreshToken.find({ userId: new Types.ObjectId(userId), revokedAt: null, expiresAt: { $gt: new Date() } })
    .select('deviceInfo expiresAt createdAt')
    .sort({ createdAt: -1 })
    .lean();
}

export async function revokeSessionById(userId: string, sessionId: string): Promise<void> {
  const session = await RefreshToken.findOne({ _id: sessionId, userId: new Types.ObjectId(userId) });
  if (!session) throw unauthenticated('Session not found');
  session.revokedAt = new Date();
  await session.save();
}
