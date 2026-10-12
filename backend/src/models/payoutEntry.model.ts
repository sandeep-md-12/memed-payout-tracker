import { model, Schema, type HydratedDocument, type Types } from 'mongoose';
import { PAYOUT_REASONS, type PayoutReason } from '../utils/constants';

/** One change to a Submission's Payout. Never edited or deleted: the audit trail for every rupee. */
export interface PayoutEntry {
  submission: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  /** Rupees: positive = paid to the Submission, negative = returned to the Campaign's budget. */
  amount: number;
  /** The Submission's View Count when the money moved. */
  viewsAt: number;
  reason: PayoutReason;
  createdAt: Date;
}

const payoutEntrySchema = new Schema<PayoutEntry>(
  {
    submission: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    viewsAt: { type: Number, required: true },
    reason: { type: String, enum: PAYOUT_REASONS, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type PayoutEntryDocument = HydratedDocument<PayoutEntry>;
export const PayoutEntryModel = model<PayoutEntry>('PayoutEntry', payoutEntrySchema);
