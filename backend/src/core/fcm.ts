import type { Types } from 'mongoose';

export interface PushDispatchResult {
  requested: number;
  sent: number;
  note: string;
}

export async function dispatchPush(userIds: Types.ObjectId[], payload: { title: string; body: string; link?: string }): Promise<PushDispatchResult> {
  void userIds; void payload;
  return {
    requested: userIds.length,
    sent: 0,
    note: 'FCM not configured yet (KI-3): notifications stored in inbox only'
  };
}
