import mongoose, { Schema } from 'mongoose';

export interface ISearchHistory extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  q: string;
  resultCount: number;
  searchedAt: Date;
}

const schema = new Schema<ISearchHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  q: { type: String, required: true, trim: true, maxlength: 100 },
  resultCount: { type: Number, default: 0 }
}, { timestamps: true });

schema.index({ userId: 1, q: 1 }, { unique: true });
schema.index({ userId: 1, searchedAt: -1 });

export const SearchHistory = mongoose.model<ISearchHistory>('SearchHistory', schema);
