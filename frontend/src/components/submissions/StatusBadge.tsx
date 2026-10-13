import { Badge } from '@/components/common/ui';
import type { SubmissionStatus } from '@/services/types';

const STATUS = {
  active: { tone: 'green', label: 'Active' },
  flagged: { tone: 'amber', label: 'Under review' },
  rejected: { tone: 'red', label: 'Rejected' },
} as const;

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
