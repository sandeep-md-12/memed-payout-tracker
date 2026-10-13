'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Alert, Field, Select, TextInput } from '@/components/common/ui';
import { ApiError, campaignApi, errorMessage } from '@/services/api';
import type { Campaign, Platform } from '@/services/types';

const MAX_MILESTONES = 10;

interface MilestoneRow {
  key: number;
  views: string;
  amount: string;
}

let nextKey = 0;
const emptyRow = (): MilestoneRow => ({ key: nextKey++, views: '', amount: '' });

export function CreateCampaignForm({ onCreated, onCancel }: { onCreated: (c: Campaign) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [budget, setBudget] = useState('');
  const [rows, setRows] = useState<MilestoneRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (key: number, field: 'views' | 'amount', value: string) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // Empty rows are ignored; the server checks the ladder (order doesn't matter, it sorts it).
      const milestones = rows
        .filter((row) => row.views !== '' || row.amount !== '')
        .map((row) => ({ views: Number(row.views), amount: Number(row.amount) }));
      const campaign = await campaignApi.create({ name, platform, budget: Number(budget), milestones });
      onCreated(campaign);
    } catch (err) {
      const details = err instanceof ApiError ? err.details?.map((d) => d.message) : undefined;
      setErrors(details?.length ? details : [errorMessage(err)]);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold">New campaign</h2>
      {errors.length > 0 && (
        <Alert kind="error">
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Campaign name">
          <TextInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Drop" />
        </Field>
        <Field label="Platform">
          <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
          </Select>
        </Field>
        <Field label="Total budget (₹)" hint="Whole rupees. Fixed once created.">
          <TextInput
            type="number"
            required
            min={1}
            step={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="10000"
          />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Milestone ladder</legend>
        <p className="text-xs text-slate-500">
          A post earns the amount of the <strong>highest</strong> milestone it reaches (not the sum). Each higher
          milestone must pay more, and the top payout can&apos;t exceed the budget.
        </p>
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs text-slate-400">{index + 1}.</span>
            <TextInput
              type="number"
              min={1}
              step={1}
              aria-label={`Milestone ${index + 1} views`}
              placeholder={['10000', '50000', '100000'][index] ?? 'Views'}
              value={row.views}
              onChange={(e) => updateRow(row.key, 'views', e.target.value)}
            />
            <span className="whitespace-nowrap text-sm text-slate-500">views → ₹</span>
            <TextInput
              type="number"
              min={1}
              step={1}
              aria-label={`Milestone ${index + 1} payout`}
              placeholder={['500', '2000', '5000'][index] ?? 'Payout'}
              value={row.amount}
              onChange={(e) => updateRow(row.key, 'amount', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              disabled={rows.length === 1}
              className="px-2 text-slate-400 hover:text-rose-600 disabled:invisible"
              aria-label={`Remove milestone ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        {rows.length < MAX_MILESTONES && (
          <button
            type="button"
            onClick={() => setRows((current) => [...current, emptyRow()])}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            + Add milestone
          </button>
        )}
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          Create campaign
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
