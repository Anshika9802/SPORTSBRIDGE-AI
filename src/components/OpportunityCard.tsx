import React from 'react';
import { Bookmark, CheckCircle2, Flag, MapPin, ArrowUpRight } from 'lucide-react';
import { CurrencyCode, formatCurrency, formatMonthlyPrice } from '../lib/currency.ts';
import { OpportunityType } from '../lib/matching.ts';
import { ScoredOpportunityCard, SPORT_LABELS } from '../types.ts';

interface OpportunityCardProps {
  scored: ScoredOpportunityCard;
  currency: CurrencyCode;
  isSaved: boolean;
  onToggleSave: (type: OpportunityType, id: number) => void;
  onOpenDetail: (type: OpportunityType, id: number) => void;
  onReport: (type: OpportunityType, id: number, title: string) => void;
}

const TYPE_LABELS: Record<OpportunityType, string> = {
  coach: 'Coach & Academy',
  facility: 'Facility',
  competition: 'Competition',
  trial: 'Selection Trial',
  scholarship: 'Scholarship',
};

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  scored,
  currency,
  isSaved,
  onToggleSave,
  onOpenDetail,
  onReport,
}) => {
  const { item, itemType, matchScore, distanceKm, aiExplanation, deterministicReason } = scored;
  const title = item.title || item.name || 'Opportunity';
  const org =
    item.academyName || item.organizer || item.providerName || item.facilityType || '';
  const sportLabel =
    item.sportSlug === 'all'
      ? 'Multi-Sport'
      : SPORT_LABELS[item.sportSlug] || item.sportSlug;

  const priceText =
    itemType === 'scholarship'
      ? `Grant up to ${formatCurrency(item.awardAmountInr ?? 0, currency)}`
      : itemType === 'coach' || itemType === 'facility'
      ? formatMonthlyPrice(item.monthlyFeeInr ?? 0, currency)
      : item.entryFeeInr && item.entryFeeInr > 0
      ? `Entry ${formatCurrency(item.entryFeeInr, currency)}`
      : 'Free Entry';

  const scoreBarColor =
    matchScore >= 80
      ? 'bg-emerald-600'
      : matchScore >= 60
      ? 'bg-blue-600'
      : 'bg-amber-500';

  const scoreTextColor =
    matchScore >= 80
      ? 'text-emerald-700'
      : matchScore >= 60
      ? 'text-blue-700'
      : 'text-amber-700';

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between transition-colors hover:border-slate-300">
      <div>
        {/* Clean unboxed metadata kicker — zero pill sandwiches */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-700">{TYPE_LABELS[itemType]}</span>
            <span aria-hidden="true">·</span>
            <span>{sportLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Ages {item.minAge}–{item.maxAge}</span>
          </div>
          {item.verified ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium whitespace-nowrap shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              Verified
            </span>
          ) : (
            <span className="text-amber-700 font-medium whitespace-nowrap shrink-0">
              Pending Review
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-1">
          <button
            type="button"
            onClick={() => onOpenDetail(itemType, item.id)}
            className="text-left hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            {title}
          </button>
        </h3>
        {org && <p className="text-sm text-slate-600 mb-3">{org}</p>}

        {/* Match % Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-700">Profile Match</span>
            <span className={`font-mono font-semibold tabular-nums ${scoreTextColor}`}>
              {matchScore}% match
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${scoreBarColor}`}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>

        {/* Why this matches you */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          <span className="font-medium text-slate-800">Why this matches you: </span>
          {aiExplanation || deterministicReason}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 text-xs text-slate-600 mb-3">
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {item.city === 'Pan-India'
                ? 'Pan-India'
                : `${item.area || item.venue || item.city}, ${item.city}`}
              {item.city !== 'Pan-India' && distanceKm > 0 ? ` · ${distanceKm} km` : ''}
            </span>
          </span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap shrink-0">
            {priceText}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onOpenDetail(itemType, item.id)}
            className="flex-1 min-h-[44px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            View Details
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(itemType, item.id)}
            aria-label={isSaved ? 'Remove from saved' : 'Save opportunity'}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-xl border transition-colors inline-flex items-center justify-center ${
              isSaved
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isSaved ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={() => onReport(itemType, item.id, title)}
            aria-label="Report listing"
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors inline-flex items-center justify-center"
          >
            <Flag className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
};
