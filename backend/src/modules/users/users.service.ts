import { Types } from 'mongoose';
import { notFound } from '../../core/errors';
import { User, type IUser } from '../../models/user.model';
import { writeAudit } from '../../models/audit-log.model';

async function getOwnedUser(userId: string): Promise<IUser> {
  const user = await User.findOne({ _id: new Types.ObjectId(userId), deletedAt: null });
  if (!user) throw notFound('Account not found');
  return user;
}

export async function updateProfile(userId: string, patch: { name?: string; phone?: string; pictureUrl?: string }): Promise<IUser> {
  const user = await getOwnedUser(userId);
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.phone !== undefined) user.phone = patch.phone;
  if (patch.pictureUrl !== undefined) user.profile.pictureUrl = patch.pictureUrl;
  await user.save();
  return user;
}

export async function updateAcademicInfo(userId: string, patch: Record<string, string | undefined>, actor: { ip?: string; userAgent?: string }): Promise<IUser> {
  const user = await getOwnedUser(userId);
  const allowed = ['instituteId', 'programId', 'regulationId', 'sessionId', 'technologyId', 'currentSemesterId'] as const;
  const before = { ...user.profile };
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      (user.profile as Record<string, Types.ObjectId | undefined>)[key] = new Types.ObjectId(patch[key]);
    }
  }
  await user.save();
  await writeAudit({ action: 'user.academic_info_updated', targetType: 'User', targetId: userId, before, after: user.profile, ...actor });
  return user;
}

export async function updatePreferences(userId: string, patch: { language?: 'bn' | 'en'; theme?: 'system' | 'light' | 'dark'; notifications?: Record<string, boolean> }): Promise<IUser> {
  const user = await getOwnedUser(userId);
  if (patch.language !== undefined) user.prefs.language = patch.language;
  if (patch.theme !== undefined) user.prefs.theme = patch.theme;
  if (patch.notifications !== undefined) user.prefs.notifications = { ...user.prefs.notifications, ...patch.notifications };
  await user.save();
  return user;
}

export async function addFcmToken(userId: string, token: string): Promise<void> {
  const user = await getOwnedUser(userId);
  if (!user.fcmTokens.includes(token)) {
    user.fcmTokens.push(token);
    if (user.fcmTokens.length > 10) user.fcmTokens = user.fcmTokens.slice(-10);
    await user.save();
  }
}

export async function removeFcmToken(userId: string, token: string): Promise<void> {
  await User.updateOne({ _id: new Types.ObjectId(userId) }, { $pull: { fcmTokens: token } });
}

export async function requestDeletion(userId: string, actor: { ip?: string; userAgent?: string }): Promise<void> {
  const user = await getOwnedUser(userId);
  user.status = 'pending_deletion';
  await user.save();
  await writeAudit({ action: 'user.deletion_requested', targetType: 'User', targetId: userId, ...actor });
}
