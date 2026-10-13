import type { Milestone } from '@/services/types';
import { formatCompact, formatRupees } from '@/utils/format';

/** The ladder as chips: "10K views → ₹500". */
export function MilestoneLadder({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Milestone ladder">
      {milestones.map((m) => (
        <li key={m.views} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
          {formatCompact(m.views)} views → <strong>{formatRupees(m.amount)}</strong>
        </li>
      ))}
    </ol>
  );
}
