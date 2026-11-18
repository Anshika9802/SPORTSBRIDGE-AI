import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { List, Map as MapIcon, Search, RotateCcw } from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap.tsx';
import { OpportunityCard } from '../components/OpportunityCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { INDIAN_CITIES } from '../lib/cities.ts';
import { OpportunityType } from '../lib/matching.ts';
import { ScoredOpportunityCard, SPORT_LABELS } from '../types.ts';

interface SearchViewProps {
  savedKeys: Set<string>;
  onToggleSave: (type: OpportunityType, id: number) => void;
  onOpenDetail: (type: OpportunityType, id: number) => void;
  onReport: (type: OpportunityType, id: number, title: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  savedKeys,
  onToggleSave,
  onOpenDetail,
  onReport,
}) => {
  const { currency, getToken } = useAuth();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [sport, setSport] = useState('all');
  const [city, setCity] = useState('all');
  const [skillLevel, setSkillLevel] = useState('all');
  const [maxPriceInr, setMaxPriceInr] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState('');
  const [age, setAge] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScoredOpportunityCard[]>([]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (type !== 'all') params.set('type', type);
      if (sport !== 'all') params.set('sport', sport);
      if (city !== 'all') params.set('city', city);
      if (skillLevel !== 'all') params.set('skillLevel', skillLevel);
      if (maxPriceInr) params.set('maxPriceInr', maxPriceInr);
      if (maxDistanceKm) params.set('maxDistanceKm', maxDistanceKm);
      if (age) params.set('age', age);
      if (dateBefore) params.set('dateBefore', dateBefore);

      const res = await fetch(`/api/opportunities/search?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed');
      setResults(json.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search error');
    } finally {
      setLoading(false);
    }
  }, [q, type, sport, city, skillLevel, maxPriceInr, maxDistanceKm, age, dateBefore, getToken]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const resetFilters = () => {
    setQ('');
    setType('all');
    setSport('all');
    setCity('all');
    setSkillLevel('all');
    setMaxPriceInr('');
    setMaxDistanceKm('');
    setAge('');
    setDateBefore('');
  };

  const mapMarkers = useMemo(
    () =>
      results.map((r) => ({
        id: `${r.itemType}-${r.item.id}`,
        lat: r.item.lat,
        lng: r.item.lng,
        title: r.item.title || r.item.name || 'Listing',
        subtitle: `${SPORT_LABELS[r.item.sportSlug] || r.item.sportSlug} · ${r.item.city} · ${r.matchScore}% match`,
        onSelect: () => onOpenDetail(r.itemType, r.item.id),
      })),
    [results, onOpenDetail]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
            Smart Search &amp; Map Explorer
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Filter coaches, facilities, competitions, selection trials, and scholarships across India.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            Map
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by academy, sport, stadium, or organizer..."
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-slate-300 text-sm text-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Opportunity type"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
          >
            <option value="all">All Types</option>
            <option value="coach">Coaches</option>
            <option value="facility">Facilities</option>
            <option value="competition">Competitions</option>
            <option value="trial">Trials</option>
            <option value="scholarship">Scholarships</option>
          </select>

          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            aria-label="Sport"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
          >
            {Object.entries(SPORT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="City"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
          >
            <option value="all">All Cities</option>
            {INDIAN_CITIES.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}
              </option>
            ))}
          </select>

          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            aria-label="Skill level"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
          >
            <option value="all">Any Skill</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="elite">Elite</option>
          </select>

          <input
            type="number"
            min={0}
            placeholder="Max ₹ fee"
            value={maxPriceInr}
            onChange={(e) => setMaxPriceInr(e.target.value)}
            aria-label="Maximum fee in INR"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm tabular-nums"
          />

          <input
            type="number"
            min={1}
            max={50}
            placeholder="Max km"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(e.target.value)}
            aria-label="Maximum distance in km"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm tabular-nums"
          />

          <input
            type="number"
            min={10}
            max={25}
            placeholder="Age (10-25)"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            aria-label="Athlete age"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-xs sm:text-sm tabular-nums"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <label htmlFor="deadline-before" className="font-medium">
              Deadline before:
            </label>
            <input
              id="deadline-before"
              type="date"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono tabular-nums">
              {results.length} opportunit{results.length === 1 ? 'y' : 'ies'} found
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-base font-semibold text-slate-900 mb-1">
            No matching opportunities found
          </p>
          <p className="text-sm text-slate-600 mb-4">
            Clear one or more filters to widen your search across cities and price tiers.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[44px] px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <LeafletMap markers={mapMarkers} heightClass="h-[460px]" zoom={5} />
          <p className="text-xs text-slate-500">
            Click any pin on the map to preview match score and jump to the opportunity detail page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((entry) => (
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
