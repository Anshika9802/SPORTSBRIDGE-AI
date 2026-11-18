import React, { useCallback, useEffect, useState } from 'react';
import { SlidersHorizontal, RefreshCw, Compass } from 'lucide-react';
import { OpportunityCard } from '../components/OpportunityCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatMonthlyPrice } from '../lib/currency.ts';
import { OpportunityType } from '../lib/matching.ts';
import { AppView, ScoredOpportunityCard, SPORT_LABELS } from '../types.ts';

interface FeedViewProps {
  savedKeys: Set<string>;
  onToggleSave: (type: OpportunityType, id: number) => void;
  onOpenDetail: (type: OpportunityType, id: number) => void;
  onReport: (type: OpportunityType, id: number, title: string) => void;
  onNavigate: (view: AppView) => void;
}

type FeedTab = 'coaches' | 'facilities' | 'competitionsAndTrials' | 'scholarships';

const TABS: Array<{ key: FeedTab; label: string }> = [
  { key: 'coaches', label: 'Coaches' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'competitionsAndTrials', label: 'Competitions & Trials' },
  { key: 'scholarships', label: 'Scholarships' },
];

export const FeedView: React.FC<FeedViewProps> = ({
  savedKeys,
  onToggleSave,
  onOpenDetail,
  onReport,
  onNavigate,
}) => {
  const { profile, guestProfile, getToken, currency, firebaseUser } = useAuth();
  const activeProfile = profile || guestProfile;

  const [tab, setTab] = useState<FeedTab>('coaches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    Record<FeedTab, ScoredOpportunityCard[]>
  >({
    coaches: [],
    facilities: [],
    competitionsAndTrials: [],
    scholarships: [],
  });

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (!profile) {
        params.set('age', String(activeProfile.age));
        params.set('city', activeProfile.city);
        params.set('pinCode', activeProfile.pinCode);
        params.set('sports', activeProfile.sports.join(','));
        params.set('skillLevel', activeProfile.skillLevel);
        params.set('monthlyBudgetInr', String(activeProfile.monthlyBudgetInr));
        params.set('goals', activeProfile.goals.join(','));
        params.set('preferredDays', activeProfile.preferredDays.join(','));
        params.set('maxDistanceKm', String(activeProfile.maxDistanceKm));
      }
      const res = await fetch(`/api/recommendations?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load recommendations');
      setRecommendations(json.recommendations);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [getToken, profile, activeProfile]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const activeItems = recommendations[tab] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Athlete Context Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            {firebaseUser && profile
              ? 'Personalized Athlete Feed'
              : 'Sample Profile Preview — Sign in or customize to save'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Matches for {activeProfile.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {activeProfile.sports.map((s) => SPORT_LABELS[s] || s).join(', ')} · Age{' '}
            <span className="tabular-nums">{activeProfile.age}</span> ·{' '}
            {activeProfile.city} (≤{activeProfile.maxDistanceKm} km) · Budget{' '}
            <span className="font-mono tabular-nums">
              {formatMonthlyPrice(activeProfile.monthlyBudgetInr, currency)}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('onboarding')}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
          Edit Athlete Profile
        </button>
      </div>

      {/* 4 Segmented Tabs */}
      <div
        role="tablist"
        aria-label="Opportunity categories"
        className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto mb-6"
      >
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const count = recommendations[t.key]?.length ?? 0;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setTab(t.key)}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}{' '}
              <span className="font-mono text-xs text-slate-400 tabular-nums ml-1">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="h-3 bg-slate-200 rounded w-1/2" />
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-2 bg-slate-200 rounded w-full mt-4" />
              <div className="h-10 bg-slate-100 rounded w-full" />
              <div className="h-11 bg-slate-200 rounded-xl w-full mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-white border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto">
          <p className="text-sm text-rose-700 font-medium mb-4">{error}</p>
          <button
            type="button"
            onClick={loadRecommendations}
            className="min-h-[44px] px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activeItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <Compass className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-1">
            No exact matches in this category yet
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Try increasing your maximum distance or monthly budget ceiling, or explore all cities in Smart Search.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => onNavigate('onboarding')}
              className="min-h-[44px] px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl cursor-pointer"
            >
              Adjust Filters
            </button>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="min-h-[44px] px-5 py-2 border border-slate-300 text-slate-800 text-sm font-medium rounded-xl cursor-pointer"
            >
              Browse All Listings
            </button>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {!loading && !error && activeItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeItems.map((entry) => (
            <OpportunityCard
              key={`${entry.itemType}-${entry.item.id}`}
              scored={entry}
              currency={currency}
              isSaved={savedKeys.has(`${entry.itemType}:${entry.item.id}`)}
              onToggleSave={onToggleSave}
              onOpenDetail={onOpenDetail}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};
