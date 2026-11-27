import mongoose, { Schema } from 'mongoose';

export interface IAppSettings extends mongoose.Document {
  branding: { appName: string; logoUrl?: string };
  homepageSections: { key: string; visible: boolean; order: number; customizable?: boolean }[];
  resultDisplay: { enabled: boolean; examId: string; startsAt?: Date | null; endsAt?: Date | null };
  homeNotice: { text: string; link: string; visible: boolean; startsAt?: Date | null; endsAt?: Date | null };
  libraryCategories: { book: boolean; note: boolean; video: boolean; subject_material: boolean; past_question: boolean };
  searchSynonyms: string[][];
  featureFlags: Record<string, unknown>;
  integrations: { googleDriveApiKey?: string };
  maintenanceMode: boolean;
  supportInfo: { email?: string; phone?: string; url?: string };
  legal: { privacyPolicy: string; terms: string };
  versionInfo: { latestAppVersion: string; notes?: string };
}

const appSettingsSchema = new Schema<IAppSettings>({
  branding: {
    appName: { type: String, default: 'DiplomaBondhu' },
    logoUrl: String
  },
  homepageSections: [{
    key: { type: String, required: true },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    customizable: { type: Boolean, default: true }
  }],
  resultDisplay: {
    enabled: { type: Boolean, default: false },
    examId: { type: String, default: '', maxlength: 120 },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null }
  },
  homeNotice: {
    text: { type: String, default: '', maxlength: 300 },
    link: { type: String, default: '', maxlength: 1000 },
    visible: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null }
  },
  libraryCategories: {
    book: { type: Boolean, default: true },
    note: { type: Boolean, default: true },
    video: { type: Boolean, default: true },
    subject_material: { type: Boolean, default: true },
    past_question: { type: Boolean, default: true }
  },
  searchSynonyms: { type: [[String]], default: [] },
  featureFlags: { type: Schema.Types.Mixed, default: {} },
  integrations: {
    googleDriveApiKey: { type: String, select: false }
  },
  maintenanceMode: { type: Boolean, default: false },
  supportInfo: {
    email: String,
    phone: String,
    url: String
  },
  legal: {
    privacyPolicy: { type: String, default: '' },
    terms: { type: String, default: '' }
  },
  versionInfo: {
    latestAppVersion: { type: String, default: '1.0.0' },
    notes: String
  }
}, { timestamps: true });

export const AppSettings = mongoose.model<IAppSettings>('AppSettings', appSettingsSchema);
