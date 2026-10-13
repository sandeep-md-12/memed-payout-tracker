import type { PayoutReason, Platform, Role, SubmissionFlag } from '@/services/types';

export function formatRupees(amount: number): string {
  const sign = amount < 0 ? '−' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN')}`;
}

export function formatViews(views: number): string {
  return views.toLocaleString('en-IN');
}

/** 10000 → "10K", 1500000 → "1.5M" (for milestone labels). */
export function formatCompact(views: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(views);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function describeSpike(flag: SubmissionFlag): string {
  const pace = flag.minutes < 1 ? 'under a minute' : `${flag.minutes} min`;
  return `+${formatViews(flag.viewsGained)} views in ${pace}`;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export const REASON_LABELS: Record<PayoutReason, string> = {
  milestone: 'Milestone reached',
  budget_cap: 'Partly paid: budget ran out',
  clawback: 'Views dropped: clawed back',
  shortfall_refill: 'Shortfall refilled',
  review_approved: 'Approved after review',
  review_rejected: 'Rejected after review',
};

export function homeFor(role: Role): string {
  return role === 'brand' ? '/brand' : '/creator';
}
