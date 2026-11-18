import React, { useState } from 'react';
import { X, Flag, CheckCircle2 } from 'lucide-react';
import { OpportunityType } from '../lib/matching.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ReportModalProps {
  target: { type: OpportunityType; id: number; title: string } | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Suspicious scholarship or upfront fee request',
  'Incorrect age group, fee, or schedule details',
  'Unverified or closed academy/venue',
  'Safety concern for youth athletes',
];

export const ReportModal: React.FC<ReportModalProps> = ({ target, onClose }) => {
  const { getToken } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          itemType: target.type,
          itemId: target.id,
          reason,
          details,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not submit report');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Report failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Flag className="w-5 h-5 text-rose-600" aria-hidden="true" />
            <h2 id="report-modal-title" className="text-xl font-bold tracking-tight">
              Report Listing
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-4">
            <div className="flex items-start gap-3 text-emerald-700 mb-4">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700">
                Thank you for helping keep young athletes safe. Our trust team has logged your report for{' '}
                <strong className="text-slate-900">{target.title}</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Reporting: <strong className="text-slate-900">{target.title}</strong>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Additional details (optional)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what seems inaccurate or unsafe..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm text-slate-900"
              />
            </div>

            {error && <p className="text-xs text-rose-600">{error}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
