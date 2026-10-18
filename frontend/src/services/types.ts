/** Shapes of the backend's responses (the `data` field of each success envelope). */

export type Role = 'brand' | 'creator';
export type Platform = 'instagram' | 'youtube';
export type SubmissionStatus = 'active' | 'flagged' | 'rejected';
export type PayoutReason =
  | 'milestone'
  | 'budget_cap'
  | 'clawback'
  | 'shortfall_refill'
  | 'review_approved'
  | 'review_rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface Milestone {
  views: number;
  amount: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
  budget: number;
  spent: number;
  remaining: number;
  isLive: boolean;
  milestones: Milestone[];
  brandName?: string;
  createdAt: string;
}

export interface NewCampaign {
  name: string;
  platform: Platform;
  budget: number;
  milestones: Milestone[];
}

export interface SubmissionFlag {
  viewsGained: number;
  minutes: number;
  flaggedAt: string;
}

export interface Submission {
  id: string;
  postUrl: string;
  views: number;
  amountOwed: number;
  paid: number;
  shortfall: number;
  status: SubmissionStatus;
  flag: SubmissionFlag | null;
  /** Null until the platform reports a View Count for the first time. */
  viewsUpdatedAt: string | null;
  createdAt: string;
  campaign?: { id: string; name: string; platform: Platform };
  creator?: { id: string; name: string };
}

export interface Earnings {
  totalEarnings: number;
  totalShortfall: number;
  pendingReview: number;
  submissionCount: number;
}

export interface PayoutEntry {
  id: string;
  submissionId: string;
  amount: number;
  viewsAt: number;
  reason: PayoutReason;
  createdAt: string;
}

export interface PayoutResult {
  submission: Submission;
  payoutChange: number;
  campaign: { id: string; spent: number; remaining: number; isLive: boolean };
}
