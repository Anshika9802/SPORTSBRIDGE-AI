import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { INDIAN_CITIES } from '../lib/cities.ts';
import { formatCurrency } from '../lib/currency.ts';
import { OpportunityType } from '../lib/matching.ts';
import { AppView, OpportunityItem, SPORT_LABELS } from '../types.ts';

interface ProviderDashboardViewProps {
  onNavigate: (view: AppView) => void;
}

interface ProviderListingsResponse {
  coaches: OpportunityItem[];
  facilities: OpportunityItem[];
  competitions: OpportunityItem[];
  trials: OpportunityItem[];
  scholarships: OpportunityItem[];
}

export const ProviderDashboardView: React.FC<ProviderDashboardViewProps> = ({
  onNavigate,
}) => {
  const { firebaseUser, getToken, currency } = useAuth();
  const [listings, setListings] = useState<ProviderListingsResponse>({
    coaches: [],
    facilities: [],
    competitions: [],
    trials: [],
    scholarships: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add / Edit form state
  const [editing, setEditing] = useState<{ type: OpportunityType; id: number } | null>(
    null
  );
  const [listingType, setListingType] = useState<OpportunityType>('coach');
  const [sportSlug, setSportSlug] = useState('football');
  const [titleOrName, setTitleOrName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [areaOrVenue, setAreaOrVenue] = useState('');
  const [pinCode, setPinCode] = useState('560001');
  const [priceInr, setPriceInr] = useState(1500);
  const [awardAmountInr, setAwardAmountInr] = useState(50000);
  const [minAge, setMinAge] = useState(10);
  const [maxAge, setMaxAge] = useState(21);
  const [deadline, setDeadline] = useState('2026-12-28');
  const [description, setDescription] = useState('');
  const [contactUrl, setContactUrl] = useState('https://sportbridge.example.org/apply');
  const [submitting, setSubmitting] = useState(false);

  const loadListings = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/provider/listings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load listings');
      setListings(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, getToken]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const resetForm = () => {
    setEditing(null);
    setTitleOrName('');
    setOrgName('');
    setAreaOrVenue('');
    setDescription('');
    setPriceInr(1500);
    setMinAge(10);
    setMaxAge(21);
  };

  const startEdit = (type: OpportunityType, item: OpportunityItem) => {
    setEditing({ type, id: item.id });
    setListingType(type);
    setSportSlug(item.sportSlug);
    setTitleOrName(item.title || item.name || '');
    setOrgName(item.academyName || item.organizer || item.providerName || item.facilityType || '');
    setCity(item.city === 'Pan-India' ? 'Bengaluru' : item.city);
    setAreaOrVenue(item.area || item.venue || '');
    setPinCode(item.pinCode || '560001');
    setPriceInr(item.monthlyFeeInr ?? item.entryFeeInr ?? 0);
    setAwardAmountInr(item.awardAmountInr ?? 50000);
    setMinAge(item.minAge);
    setMaxAge(item.maxAge);
    setDeadline(item.deadline || '2026-12-28');
    setDescription(item.description);
    setContactUrl(item.contactUrl || item.applyUrl || 'https://sportbridge.example.org');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOrName.trim() || !description.trim()) {
      setError('Title/Name and description are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      const payload = {
        listingType,
        sportSlug,
        name: titleOrName.trim(),
        title: titleOrName.trim(),
        academyName: orgName.trim() || 'Community Academy',
        facilityType: orgName.trim() || 'Training Ground',
        organizer: orgName.trim() || 'Sports Association',
        city,
        area: areaOrVenue.trim() || 'Central',
        venue: areaOrVenue.trim() || 'Municipal Stadium',
        pinCode,
        priceInr: Number(priceInr),
        awardAmountInr: Number(awardAmountInr),
        minAge: Number(minAge),
        maxAge: Number(maxAge),
        deadline,
        description: description.trim(),
        contactUrl: contactUrl.trim(),
        applyUrl: contactUrl.trim(),
      };

      const url = editing
        ? `/api/provider/listings/${editing.type}/${editing.id}`
        : '/api/provider/listings';
      const method = editing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save listing');
      setNotice(
        editing
          ? 'Listing updated successfully.'
          : 'Listing published and queued for verification review.'
      );
      resetForm();
      await loadListings();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 pb-24 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
            Coach &amp; Provider Dashboard
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Sign in with Google to publish coaching programs, facilities, trials, or scholarships.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="min-h-[44px] px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl cursor-pointer"
          >
            Sign In as Provider
          </button>
        </div>
      </div>
    );
  }

  const allMine: Array<{ type: OpportunityType; item: OpportunityItem }> = [
    ...listings.coaches.map((item) => ({ type: 'coach' as const, item })),
    ...listings.facilities.map((item) => ({ type: 'facility' as const, item })),
    ...listings.competitions.map((item) => ({ type: 'competition' as const, item })),
    ...listings.trials.map((item) => ({ type: 'trial' as const, item })),
    ...listings.scholarships.map((item) => ({ type: 'scholarship' as const, item })),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          Provider Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Add and manage coaching batches, training facilities, competitions, selection trials, and scholarships.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {editing ? 'Edit Listing' : 'Add New Opportunity'}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-slate-600 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listing Type
              </label>
              <select
                value={listingType}
                disabled={Boolean(editing)}
                onChange={(e) => setListingType(e.target.value as OpportunityType)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white disabled:bg-slate-100"
              >
                <option value="coach">Coach / Academy</option>
                <option value="facility">Facility</option>
                <option value="competition">Competition</option>
                <option value="trial">Selection Trial</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sport
              </label>
              <select
                value={sportSlug}
                onChange={(e) => setSportSlug(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm bg-white"
              >
                {Object.entries(SPORT_LABELS)
                  .filter(([k]) => k !== 'all' || listingType === 'scholarship')
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {listingType === 'coach' ? 'Coach Name' : 'Listing Title'}
            </label>
            <input
              type="text"
              value={titleOrName}
              onChange={(e) => setTitleOrName(e.target.value)}
              placeholder={
                listingType === 'coach'
                  ? 'e.g., Coach Karthik Menon'
                  : 'e.g., Koramangala U-17 Football Trials'
              }
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academy / Organizer Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Bengaluru Youth FC"
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Area / Venue
              </label>
              <input
                type="text"
                value={areaOrVenue}
                onChange={(e) => setAreaOrVenue(e.target.value)}
                placeholder="e.g., Indiranagar"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {listingType === 'scholarship' ? 'Award Amount (₹)' : 'Fee (₹)'}
              </label>
              <input
                type="number"
                min={0}
                value={listingType === 'scholarship' ? awardAmountInr : priceInr}
                onChange={(e) =>
                  listingType === 'scholarship'
                    ? setAwardAmountInr(Number(e.target.value))
                    : setPriceInr(Number(e.target.value))
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pin Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Min Age
              </label>
              <input
                type="number"
                min={8}
                max={25}
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Age
              </label>
              <input
                type="number"
                min={10}
                max={30}
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Program Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Training focus, batch timings, safety protocols, and required documents..."
              className="w-full p-3 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official Contact / Registration URL
            </label>
            <input
              type="url"
              value={contactUrl}
              onChange={(e) => setContactUrl(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[48px] px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {submitting
              ? 'Saving...'
              : editing
              ? 'Update Listing'
              : 'Publish Opportunity'}
          </button>
        </form>

        {/* Provider Listings */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Your Published Listings
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {allMine.length} total
            </span>
          </div>

          {loading ? (
            <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
          ) : allMine.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              You haven’t published any listings yet. Use the form to list your academy, ground, trial, or grant.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allMine.map(({ type, item }) => {
                const title = item.title || item.name || 'Listing';
                const amount =
                  type === 'scholarship'
                    ? item.awardAmountInr ?? 0
                    : item.monthlyFeeInr ?? item.entryFeeInr ?? 0;
                return (
                  <div
                    key={`${type}-${item.id}`}
                    className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                        <span className="capitalize font-semibold text-slate-700">
                          {type}
                        </span>
                        <span>·</span>
                        <span>{SPORT_LABELS[item.sportSlug] || item.sportSlug}</span>
                        <span>·</span>
                        {item.verified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Pending Verification
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900">{title}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {item.city} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatCurrency(amount, currency)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(type, item)}
                      className="min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
