import { formatRupees } from '@/utils/format';

/** Budget spent vs remaining, as a bar with both numbers. */
export function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget spent"
      >
        <div
          className={`h-full rounded-full ${percent >= 100 ? 'bg-slate-400' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>
          <strong className="text-slate-900">{formatRupees(spent)}</strong> spent ({percent}%)
        </span>
        <span>
          <strong className="text-slate-900">{formatRupees(budget - spent)}</strong> remaining of {formatRupees(budget)}
        </span>
      </div>
    </div>
  );
}
