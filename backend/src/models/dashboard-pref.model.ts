import mongoose, { Schema } from 'mongoose';

export interface IDashboardSectionPref {
  key: string;
  visible: boolean;
  order: number;
}

export interface IDashboardPref extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  sections: IDashboardSectionPref[];
}

const sectionSchema = new Schema<IDashboardSectionPref>({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  visible: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { _id: false });

const schema = new Schema<IDashboardPref>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  sections: { type: [sectionSchema], default: [] }
}, { timestamps: true });

export const DashboardPref = mongoose.model<IDashboardPref>('DashboardPref', schema);
