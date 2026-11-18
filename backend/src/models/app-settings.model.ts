import mongoose, { Schema } from 'mongoose';

export interface IAppSettings extends mongoose.Document {
  branding: { appName: string; logoUrl?: string };
  homepageSections: { key: string; visible: boolean; order: number }[];
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
    order: { type: Number, default: 0 }
  }],
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
