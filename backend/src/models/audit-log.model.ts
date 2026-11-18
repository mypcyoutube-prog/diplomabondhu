import mongoose, { Schema } from 'mongoose';

export interface IAuditLog extends mongoose.Document {
  actorId?: mongoose.Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId | string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  at: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true, index: true },
  targetType: String,
  targetId: Schema.Types.Mixed,
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  at: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

auditLogSchema.index({ actorId: 1, at: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export interface AuditEntry {
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  await AuditLog.create({ ...entry, at: new Date() });
}
