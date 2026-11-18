import mongoose, { Schema } from 'mongoose';

export type UserRole = 'student' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending_deletion';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  profile: {
    pictureUrl?: string;
    instituteId?: mongoose.Types.ObjectId;
    programId?: mongoose.Types.ObjectId;
    regulationId?: mongoose.Types.ObjectId;
    sessionId?: mongoose.Types.ObjectId;
    technologyId?: mongoose.Types.ObjectId;
    currentSemesterId?: mongoose.Types.ObjectId;
  };
  prefs: {
    language: 'bn' | 'en';
    theme: 'system' | 'light' | 'dark';
    notifications: Record<string, boolean>;
  };
  fcmTokens: string[];
  guidelinesAcceptedAt?: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['student', 'moderator', 'admin'], default: 'student', index: true },
    status: { type: String, enum: ['active', 'suspended', 'pending_deletion'], default: 'active', index: true },
    profile: {
      pictureUrl: String,
      instituteId: { type: Schema.Types.ObjectId, ref: 'Institute' },
      programId: { type: Schema.Types.ObjectId, ref: 'EducationProgram' },
      regulationId: { type: Schema.Types.ObjectId, ref: 'Regulation' },
      sessionId: { type: Schema.Types.ObjectId, ref: 'AcademicSession' },
      technologyId: { type: Schema.Types.ObjectId, ref: 'Technology' },
      currentSemesterId: { type: Schema.Types.ObjectId, ref: 'Semester' }
    },
    prefs: {
      language: { type: String, enum: ['bn', 'en'], default: 'bn' },
      theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
      notifications: { type: Schema.Types.Mixed, default: {} }
    },
    fcmTokens: { type: [String], default: [] },
    guidelinesAcceptedAt: Date,
    lastLoginAt: Date,
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.index({ name: 'text' });

export const User = mongoose.model<IUser>('User', userSchema);
