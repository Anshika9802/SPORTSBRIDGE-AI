import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Flag,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { formatCurrency, formatMonthlyPrice } from '../lib/currency.ts';
import { OpportunityType } from '../lib/matching.ts';
import { AppView, GOAL_LABELS, ScoredOpportunityCard, SPORT_LABELS } from '../types.ts';

interface DetailViewProps {
  itemType: OpportunityType;
  itemId: number;
  isSaved: boolean;
  onToggleSave: (type: OpportunityType, id: number) => void;
  onReport: (type: OpportunityType, id: number, title: string) => void;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  itemType,
  itemId,
  isSaved,
  onToggleSave,
  onReport,
  onBack,
  onNavigate,
}) => {
  const { currency, getToken, firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScoredOpportunityCard | null>(null);
  const [trackNotice, setTrackNotice] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch(`/api/opportunities/${itemType}/${itemId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Could not load opportunity');
        if (active) setData(json.match);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Load error');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [itemType, itemId, getToken]);

  const handleTrackDeadline = async () => {
    if (!data) return;
    if (!firebaseUser) {
      onNavigate('auth');
      return;
    }
    setTracking(true);
    setTrackNotice(null);
    try {
      const token = await getToken();
      const title = data.item.title || data.item.name || 'Opportunity';
      const deadline =
        data.item.deadline ||
        data.item.eventDate ||
        data.item.trialDate ||
        '2026-12-31';

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemType,
          itemId,
          title,
          deadline,
          status: 'planned',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not add deadline');
      setTrackNotice('Added to your Deadlines & Applications tracker.');
    } catch (err: unknown) {
      setTrackNotice(err instanceof Error ? err.message : 'Failed to track deadline');
    } finally {
      setTracking(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-4">
        <div className="h-8 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 pb-24 text-center">
        <p className="text-sm text-rose-700 mb-4">{error || 'Opportunity not found'}</p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-5 py-2 bg-slate-900 text-white text-sm rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { item, matchScore, distanceKm, breakdown, deterministicReason } = data;
  const title = item.title || item.name || 'Opportunity';
  const org =
    item.academyName || item.organizer || item.providerName || item.facilityType || '';
  const externalUrl = item.applyUrl || item.contactUrl || '#';
  const days = item.trainingDays || item.openDays || [];

  const priceDisplay =
    itemType === 'scholarship'
      ? `Award up to ${formatCurrency(item.awardAmountInr ?? 0, currency)}`
      : itemType === 'coach' || itemType === 'facility'
      ? formatMonthlyPrice(item.monthlyFeeInr ?? 0, currency)
      : item.entryFeeInr && item.entryFeeInr > 0
      ? `Entry fee ${formatCurrency(item.entryFeeInr, currency)}`
      : 'Free Entry';

  const checklist: string[] = item.eligibilityChecklist
    ? item.eligibilityChecklist
    : [
        `Age requirement: ${item.minAge} to ${item.maxAge} years`,
        `Skill tier: ${item.skillLevels.join(', ')}`,
        item.eligibilityNotes || 'Bring valid government photo ID / age proof.',
        item.minAge < 18 ? 'Parent/guardian consent required for athletes under 18.' : '',
      ].filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {item.imageUrl && (
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                <div>
                  <span className="font-semibold text-slate-700 capitalize">{itemType}</span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    {item.sportSlug === 'all'
                      ? 'Multi-Sport'
                      : SPORT_LABELS[item.sportSlug] || item.sportSlug}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>
                    Ages {item.minAge}–{item.maxAge}
                  </span>
                </div>
                {item.verified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified Listing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <ShieldAlert className="w-4 h-4" />
                    Pending Verification
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 leading-tight mb-1">
                {title}
              </h1>
              {org && <p className="text-base text-slate-600 mb-4">{org}</p>}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-y border-slate-100 text-sm mb-4">
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {priceDisplay}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {item.city === 'Pan-India'
                    ? 'Pan-India'
                    : `${item.venue || item.area || item.city}, ${item.city}`}
                  {item.city !== 'Pan-India' && distanceKm > 0 ? ` (${distanceKm} km away)` : ''}
                </span>
                {(item.deadline || item.eventDate || item.trialDate) && (
                  <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono text-xs tabular-nums">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {item.deadline ? `Deadline: ${item.deadline}` : ''}
                    {item.eventDate ? ` · Event: ${item.eventDate}` : ''}
                    {item.trialDate ? ` · Trial: ${item.trialDate}` : ''}
                  </span>
                )}
              </div>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed mb-5">
                {item.description}
              </p>

              {/* Schedule & Amenities */}
              {days.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Training / Open Days
                  </h2>
                  <p className="text-sm font-medium text-slate-800">{days.join(' · ')}</p>
                </div>
              )}

              {item.certification && (
                <div className="mb-4">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Coaching Credentials
                  </h2>
                  <p className="text-sm text-slate-800">
                    {item.certification} ({item.experienceYears} years experience)
                  </p>
                </div>
              )}

              {item.amenities && item.amenities.length > 0 && (
                <div className="mb-4">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Facility Amenities
                  </h2>
                  <p className="text-sm text-slate-800">{item.amenities.join(' · ')}</p>
                </div>
              )}

              <div className="mb-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Recommended For Goals
                </h2>
                <p className="text-sm text-slate-800">
                  {item.goalTags.map((g) => GOAL_LABELS[g] || g).join(' · ')}
                </p>
              </div>
            </div>
          </div>

          {/* Eligibility Checklist */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-3">
              Eligibility Checklist
            </h2>
            <ul className="space-y-2.5">
              {checklist.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {itemType === 'scholarship' && (
              <p className="text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
                Disclaimer: Eligibility indicators are based on published grant guidelines and are not guaranteed.
              </p>
            )}
          </div>
        </div>

        {/* Side Column: Match Breakdown, Actions & Map */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Match Breakdown
              </h2>
              <span className="font-mono text-xl font-bold text-blue-700 tabular-nums">
                {matchScore}%
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4">{deterministicReason}</p>

            <div className="space-y-3 text-xs">
              {[
                { label: 'Skill-Level Fit', val: breakdown.skillFit, max: 25 },
                { label: 'Goal Alignment', val: breakdown.goalAlignment, max: 25 },
                { label: 'Affordability', val: breakdown.affordability, max: 20 },
                { label: 'Distance Proximity', val: breakdown.distance, max: 15 },
                { label: 'Schedule Availability', val: breakdown.timing, max: 15 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-700 font-medium">{row.label}</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {row.val}/{row.max}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(row.val / row.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-2.5">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 inline-flex items-center justify-center gap-2"
              >
                Contact / Apply on Official Site
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleSave(itemType, itemId)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSaved
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark
                    className="w-4 h-4"
                    fill={isSaved ? 'currentColor' : 'none'}
                  />
                  {isSaved ? 'Saved' : 'Save'}
                </button>

                <button
                  type="button"
                  disabled={tracking}
                  onClick={handleTrackDeadline}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  {tracking ? 'Adding...' : 'Track Deadline'}
                </button>
              </div>

              {trackNotice && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  {trackNotice}
                </p>
              )}

              <button
                type="button"
                onClick={() => onReport(itemType, itemId, title)}
                className="w-full min-h-[44px] text-xs font-medium text-slate-500 hover:text-rose-600 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                Report inaccurate or suspicious listing
              </button>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Approximate Venue Location
            </h2>
            <LeafletMap
              centerLat={item.lat}
              centerLng={item.lng}
              zoom={13}
              heightClass="h-60"
              markers={[
                {
                  id: `${itemType}-${item.id}`,
                  lat: item.lat,
                  lng: item.lng,
                  title,
                  subtitle: item.venue || item.area || item.city,
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
