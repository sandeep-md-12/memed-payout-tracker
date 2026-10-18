import type { PayoutEntry } from '@/services/types';
import { formatDateTime, formatRupees, formatViews, REASON_LABELS } from '@/utils/format';

/** Every money movement, oldest first. `submissionLabel` names the Submission when entries span several Submissions. */
export function PayoutHistory({ entries, submissionLabel }: { entries: PayoutEntry[]; submissionLabel?: (submissionId: string) => string }) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">No money has moved yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-4 font-medium">When</th>
            {submissionLabel && <th className="py-2 pr-4 font-medium">Submission</th>}
            <th className="py-2 pr-4 font-medium">Views at the time</th>
            <th className="py-2 pr-4 font-medium">Reason</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap py-2 pr-4 text-slate-600">{formatDateTime(entry.createdAt)}</td>
              {submissionLabel && <td className="py-2 pr-4">{submissionLabel(entry.submissionId)}</td>}
              <td className="py-2 pr-4">{formatViews(entry.viewsAt)}</td>
              <td className="py-2 pr-4">{REASON_LABELS[entry.reason]}</td>
              <td className={`py-2 text-right font-medium ${entry.amount < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {entry.amount > 0 ? '+' : ''}
                {formatRupees(entry.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
