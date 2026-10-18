/** Pure Spike detection: no database. */

export interface SpikeRule {
  /** Gains smaller than this are never a Spike, however fast (avoids flagging tiny posts). */
  minGain: number;
  /** A gain arriving faster than this pace is a Spike. */
  maxViewsPerHour: number;
}

export interface ViewsReport {
  views: number;
  at: Date;
}

export interface Spike {
  viewsGained: number;
  minutes: number;
}

const MS_PER_HOUR = 3_600_000;
// Two reports in the same instant would divide by zero; treat them as one second apart.
const MIN_HOURS = 1 / 3_600;

/**
 * Compares a new View Count report with the previous one and returns the Spike, if any.
 * A first report (no previous one) is never a Spike: there is no pace to measure it against, and
 * a Post may already have plenty of views when it is submitted.
 */
export function detectSpike(previous: ViewsReport | null, current: ViewsReport, rule: SpikeRule): Spike | null {
  if (!previous) return null;

  const viewsGained = current.views - previous.views;
  if (viewsGained < rule.minGain) return null;

  const hours = Math.max((current.at.getTime() - previous.at.getTime()) / MS_PER_HOUR, MIN_HOURS);
  if (viewsGained / hours <= rule.maxViewsPerHour) return null;

  return { viewsGained, minutes: Math.round(hours * 60 * 10) / 10 };
}
