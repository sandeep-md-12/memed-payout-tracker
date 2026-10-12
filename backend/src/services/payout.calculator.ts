/**
 * Pure payout maths: no database, no Express. Every rupee decision in the app comes from
 * these functions, which is why they carry most of the unit tests.
 */

export interface Milestone {
  /** View threshold; reached when views >= this number. */
  views: number;
  /** Total amount a post is owed once it reaches this Milestone (not added on top of lower ones). */
  amount: number;
}

/** Returns a copy of the ladder ordered by view threshold, lowest first. */
export function sortLadder(milestones: readonly Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.views - b.views);
}

/**
 * Lists everything wrong with a Milestone Ladder (empty when valid). Expects a sorted ladder.
 * Rules: thresholds and amounts both strictly increase, and the top amount fits in the budget.
 */
export function findLadderProblems(ladder: readonly Milestone[], budget: number): string[] {
  const problems: string[] = [];
  ladder.forEach((milestone, i) => {
    const previous = ladder[i - 1];
    if (!previous) return;
    if (milestone.views === previous.views) {
      problems.push(`Two milestones use the same view threshold (${milestone.views})`);
    } else if (milestone.amount <= previous.amount) {
      problems.push(
        `The ${milestone.views}-view milestone must pay more than the ${previous.views}-view milestone`,
      );
    }
  });
  const top = ladder[ladder.length - 1];
  if (top && top.amount > budget) {
    problems.push(`The highest milestone (₹${top.amount}) cannot be more than the budget (₹${budget})`);
  }
  return problems;
}

/**
 * The Amount Owed for a View Count: the amount of the highest Milestone reached.
 * Crossing several Milestones at once pays only the highest, never the sum.
 */
export function amountOwedFor(views: number, ladder: readonly Milestone[]): number {
  let owed = 0;
  for (const milestone of ladder) {
    if (views < milestone.views) break;
    owed = milestone.amount;
  }
  return owed;
}

/**
 * How much a Submission's Payout should change right now (positive = pay more, negative = Clawback).
 *
 * - Moves the Payout toward the Amount Owed, so repeating an update changes nothing (no double pay).
 * - A raise is capped by Budget Remaining (partial payout when the budget runs out).
 * - A Clawback is never capped: it only returns money to the budget.
 */
export function payoutChange(params: { amountOwed: number; paid: number; budgetRemaining: number }): number {
  const gap = params.amountOwed - params.paid;
  if (gap <= 0) return gap;
  return Math.min(gap, Math.max(params.budgetRemaining, 0));
}

/**
 * Shares money that came back to a Campaign among Submissions with a Shortfall, in the order given
 * (callers pass oldest first). Returns only the Submissions that receive something.
 */
export function allocateRefill<T extends { shortfall: number }>(
  available: number,
  waiting: readonly T[],
): Array<{ item: T; amount: number }> {
  const grants: Array<{ item: T; amount: number }> = [];
  let left = available;
  for (const item of waiting) {
    if (left <= 0) break;
    const amount = Math.min(item.shortfall, left);
    if (amount <= 0) continue;
    grants.push({ item, amount });
    left -= amount;
  }
  return grants;
}
