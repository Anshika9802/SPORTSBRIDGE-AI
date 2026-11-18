import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { INDIAN_CITIES } from '../lib/cities.ts';
import { formatCurrency } from '../lib/currency.ts';
import {
  AchievementLevel,
  IncomeBracket,
  OpportunityType,
  ScholarshipEligibilityEvaluation,
} from '../lib/matching.ts';
import {
  ACHIEVEMENT_LABELS,
  INCOME_LABELS,
  OpportunityItem,
  SPORT_LABELS,
} from '../types.ts';

interface ScholarshipCheckerViewProps {
  onOpenDetail: (type: OpportunityType, id: number) => void;
}

interface EvaluationResult {
  scholarship: OpportunityItem;
  evaluation: ScholarshipEligibilityEvaluation;
}

const SPORTS_OPTIONS = ['cricket', 'football', 'badminton', 'athletics', 'swimming'];

export const ScholarshipCheckerView: React.FC<ScholarshipCheckerViewProps> = ({
  onOpenDetail,
}) => {
  const { profile, guestProfile, currency } = useAuth();
  const base = profile || guestProfile;

  const [age, setAge] = useState(base.age);
  const [sports, setSports] = useState<string[]>(base.sports);
  const [achievementLevel, setAchievementLevel] = useState<AchievementLevel>(
    base.achievementLevel
  );
  const [incomeBracket, setIncomeBracket] = useState<IncomeBracket>(base.incomeBracket);
  const [city, setCity] = useState(base.city);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState('');
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scholarships/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age,
          sports,
          achievementLevel,
          incomeBracket,
          city,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Eligibility check failed');
      setDisclaimer(json.disclaimer);
      setEvaluations(json.evaluations || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setLoading(false);
    }
  }, [age, sports, achievementLevel, incomeBracket, city]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const toggleSport = (slug: string) => {
    setSports((prev) =>
      prev.includes(slug)
        ? prev.length > 1
          ? prev.filter((s) => s !== slug)
          : prev
        : [...prev, slug]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          Scholarship Eligibility Checker
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-1">
          Compare your athlete profile against published age, sport, achievement, income, and location criteria.
        </p>
      </div>

      {/* Mandatory Indicative Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
          <strong>Indicative Results Only:</strong>{' '}
          {disclaimer ||
            'Eligibility results are indicative based on published guidelines and self-reported details, not guaranteed. Final award decisions are made solely by the issuing foundation or ministry.'}
        </p>
      </div>

      {/* Checker Inputs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Athlete Age
            </label>
            <input
              type="number"
              min={10}
              max={25}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Achievement Level
            </label>
            <select
              value={achievementLevel}
              onChange={(e) => setAchievementLevel(e.target.value as AchievementLevel)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {(Object.keys(ACHIEVEMENT_LABELS) as AchievementLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ACHIEVEMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Annual Family Income
            </label>
            <select
              value={incomeBracket}
              onChange={(e) => setIncomeBracket(e.target.value as IncomeBracket)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {(Object.keys(INCOME_LABELS) as IncomeBracket[]).map((k) => (
                <option key={k} value={k}>
                  {INCOME_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              City of Residence
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            Sport(s)
          </span>
          <div className="flex flex-wrap gap-2">
            {SPORTS_OPTIONS.map((slug) => {
              const active = sports.includes(slug);
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleSport(slug)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {SPORT_LABELS[slug]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 bg-white border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {evaluations.map(({ scholarship, evaluation }) => {
            const statusConfig =
              evaluation.status === 'Likely eligible'
                ? {
                    icon: CheckCircle2,
                    textColor: 'text-emerald-700',
                    bgBar: 'bg-emerald-600',
                  }
                : evaluation.status === 'Maybe'
                ? {
                    icon: HelpCircle,
                    textColor: 'text-amber-700',
                    bgBar: 'bg-amber-500',
                  }
                : {
                    icon: XCircle,
                    textColor: 'text-rose-700',
                    bgBar: 'bg-rose-500',
                  };
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={scholarship.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">
                      {scholarship.providerName} ·{' '}
                      {scholarship.sportSlug === 'all'
                        ? 'Multi-Sport'
                        : SPORT_LABELS[scholarship.sportSlug]}{' '}
                      · Deadline{' '}
                      <span className="font-mono tabular-nums">{scholarship.deadline}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {scholarship.title}
                    </h2>
                    <p className="font-mono text-sm font-semibold text-slate-800 tabular-nums mt-1">
                      Grant up to {formatCurrency(scholarship.awardAmountInr ?? 0, currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${statusConfig.textColor}`}
                    >
                      <StatusIcon className="w-5 h-5" aria-hidden="true" />
                      <span>{evaluation.status}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-700 tabular-nums">
                      ({evaluation.score}%)
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full ${statusConfig.bgBar}`}
                    style={{ width: `${evaluation.score}%` }}
                  />
                </div>

                <p className="text-sm text-slate-700 mb-4">{evaluation.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
                  {evaluation.criteria.map((c) => (
                    <div
                      key={c.criterion}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 font-semibold text-slate-800 mb-1">
                        <span>{c.criterion}</span>
                        <span
                          className={
                            c.passed === true
                              ? 'text-emerald-700'
                              : c.passed === 'partial'
                              ? 'text-amber-700'
                              : 'text-rose-700'
                          }
                        >
                          {c.passed === true
                            ? 'Met'
                            : c.passed === 'partial'
                            ? 'Review'
                            : 'Not met'}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-snug">{c.detail}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDetail('scholarship', scholarship.id)}
                  className="min-h-[44px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  View Scholarship &amp; Apply Checklist
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
