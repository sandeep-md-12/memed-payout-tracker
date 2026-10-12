import {
  allocateRefill,
  amountOwedFor,
  findLadderProblems,
  payoutChange,
  sortLadder,
  type Milestone,
} from '../../src/services/payout.calculator';

// The brief's example ladder: 10K → ₹500, 50K → ₹2,000, 100K → ₹5,000.
const ladder: Milestone[] = [
  { views: 10_000, amount: 500 },
  { views: 50_000, amount: 2_000 },
  { views: 100_000, amount: 5_000 },
];

describe('amountOwedFor', () => {
  it.each([
    [0, 0],
    [9_999, 0],
    [10_000, 500], // reaching the threshold exactly counts as crossing it
    [12_000, 500],
    [49_999, 500],
    [60_000, 2_000],
    [100_000, 5_000],
    [5_000_000, 5_000], // beyond the top milestone pays the top amount, nothing more
  ])('%i views → ₹%i', (views, expected) => {
    expect(amountOwedFor(views, ladder)).toBe(expected);
  });

  it('pays only the highest milestone when one update crosses several (not the sum)', () => {
    expect(amountOwedFor(120_000, ladder)).toBe(5_000); // not 500 + 2,000 + 5,000
  });
});

describe('payoutChange', () => {
  it('pays the full amount owed when the budget allows', () => {
    expect(payoutChange({ amountOwed: 500, paid: 0, budgetRemaining: 10_000 })).toBe(500);
  });

  it('tops up to the new milestone instead of paying it on top', () => {
    // Paid ₹500 at 12K views; now at 60K views the post is owed ₹2,000 in total.
    expect(payoutChange({ amountOwed: 2_000, paid: 500, budgetRemaining: 10_000 })).toBe(1_500);
  });

  it('returns 0 when the same update is repeated (never double-pays)', () => {
    expect(payoutChange({ amountOwed: 2_000, paid: 2_000, budgetRemaining: 10_000 })).toBe(0);
  });

  describe('budget cap', () => {
    it('pays only what is left when the budget runs out mid-payout (partial payout)', () => {
      expect(payoutChange({ amountOwed: 2_000, paid: 500, budgetRemaining: 800 })).toBe(800);
    });

    it('pays nothing when the budget is already used up', () => {
      expect(payoutChange({ amountOwed: 5_000, paid: 0, budgetRemaining: 0 })).toBe(0);
    });

    it('never pays more than the remaining budget, even if the remaining figure is negative', () => {
      expect(payoutChange({ amountOwed: 5_000, paid: 0, budgetRemaining: -100 })).toBe(0);
    });

    it('pays exactly the remaining budget when it matches the gap', () => {
      expect(payoutChange({ amountOwed: 1_500, paid: 0, budgetRemaining: 1_500 })).toBe(1_500);
    });
  });

  describe('clawback', () => {
    it('reduces the payout when views fall below a milestone', () => {
      // Was paid ₹2,000 at 60K; views dropped to 40K, so only ₹500 is owed.
      expect(payoutChange({ amountOwed: 500, paid: 2_000, budgetRemaining: 0 })).toBe(-1_500);
    });

    it('claws back everything when views fall below the first milestone', () => {
      expect(payoutChange({ amountOwed: 0, paid: 500, budgetRemaining: 9_500 })).toBe(-500);
    });
  });
});

describe('allocateRefill', () => {
  const waiting = [
    { id: 'oldest', shortfall: 1_200 },
    { id: 'middle', shortfall: 500 },
    { id: 'newest', shortfall: 300 },
  ];

  it('fills shortfalls oldest-first until the money runs out', () => {
    const grants = allocateRefill(1_500, waiting);
    expect(grants.map((g) => [g.item.id, g.amount])).toEqual([
      ['oldest', 1_200],
      ['middle', 300],
    ]);
  });

  it('leaves the rest in the budget when every shortfall is covered', () => {
    const grants = allocateRefill(5_000, waiting);
    expect(grants.reduce((sum, g) => sum + g.amount, 0)).toBe(2_000);
  });

  it('gives nothing when no money came back', () => {
    expect(allocateRefill(0, waiting)).toEqual([]);
  });
});

describe('ladder rules', () => {
  it('sorts milestones by view threshold', () => {
    const shuffled = [ladder[2]!, ladder[0]!, ladder[1]!];
    expect(sortLadder(shuffled)).toEqual(ladder);
  });

  it('accepts a valid ladder', () => {
    expect(findLadderProblems(ladder, 10_000)).toEqual([]);
  });

  it('rejects a top milestone larger than the budget', () => {
    expect(findLadderProblems(ladder, 4_999)).toEqual([
      'The highest milestone (₹5000) cannot be more than the budget (₹4999)',
    ]);
  });

  it('rejects two milestones with the same threshold', () => {
    const problems = findLadderProblems(
      [
        { views: 10_000, amount: 500 },
        { views: 10_000, amount: 900 },
      ],
      10_000,
    );
    expect(problems).toEqual(['Two milestones use the same view threshold (10000)']);
  });

  it('rejects a higher threshold that does not pay more', () => {
    const problems = findLadderProblems(
      [
        { views: 10_000, amount: 500 },
        { views: 50_000, amount: 500 },
      ],
      10_000,
    );
    expect(problems).toEqual(['The 50000-view milestone must pay more than the 10000-view milestone']);
  });
});
