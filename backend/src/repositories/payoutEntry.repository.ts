import type { ClientSession } from 'mongoose';
import { PayoutEntryModel, type PayoutEntry, type PayoutEntryDocument } from '../models';

export type NewPayoutEntry = Omit<PayoutEntry, 'createdAt'>;

export const payoutEntryRepository = {
  async insertMany(entries: NewPayoutEntry[], session: ClientSession): Promise<void> {
    if (entries.length === 0) return;
    // `ordered` keeps the entries in the order the money moved.
    await PayoutEntryModel.insertMany(entries, { session, ordered: true });
  },

  findBySubmission(submissionId: string): Promise<PayoutEntryDocument[]> {
    return PayoutEntryModel.find({ submission: submissionId }).sort({ createdAt: 1, _id: 1 }).exec();
  },

  findByCampaign(campaignId: string): Promise<PayoutEntryDocument[]> {
    return PayoutEntryModel.find({ campaign: campaignId }).sort({ createdAt: 1, _id: 1 }).exec();
  },
};
