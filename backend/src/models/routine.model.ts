import mongoose, { Schema } from 'mongoose';

export interface IRoutine extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  slots: {
    day: number;
    start: string;
    end: string;
    title: string;
    kind: 'class' | 'personal';
    room?: string;
  }[];
  deletedAt?: Date;
}

const slotSchema = new Schema({
  day: { type: Number, min: 0, max: 6, required: true },
  start: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  end: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  kind: { type: String, enum: ['class', 'personal'], default: 'class' },
  room: { type: String, maxlength: 100 }
}, { _id: false });

const schema = new Schema<IRoutine>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  slots: { type: [slotSchema], default: [] },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

export const Routine = mongoose.model<IRoutine>('Routine', schema);
