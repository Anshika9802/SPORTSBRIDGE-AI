import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, Calendar, Trash2, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { OpportunityType } from '../lib/matching.ts';
import { ApplicationRecord, AppView, SavedItemRecord, SPORT_LABELS } from '../types.ts';

interface SavedDeadlinesViewProps {
  onOpenDetail: (type: OpportunityType, id: number) => void;
  onToggleSave: (type: OpportunityType, id: number) => void;
  onNavigate: (view: AppView) => void;
}

export const SavedDeadlinesView: React.FC<SavedDeadlinesViewProps> = ({
  onOpenDetail,
  onToggleSave,
  onNavigate,
}) => {
  const { firebaseUser, getToken } = useAuth();
  const [saved, setSaved] = useState<SavedItemRecord[]>([]);
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [sRes, aRes] = await Promise.all([
        fetch('/api/saved', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [sJson, aJson] = await Promise.all([sRes.json(), aRes.json()]);
      if (!sRes.ok) throw new Error(sJson.error || 'Failed to load saved');
      if (!aRes.ok) throw new Error(aJson.error || 'Failed to load deadlines');
      setSaved(sJson);
      setApps(aJson);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, getToken]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleStatusChange = async (id: number, status: ApplicationRecord['status']) => {
    const token = await getToken();
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    }
  };

  const handleDeleteApp = async (id: number) => {
    const token = await getToken();
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-14 pb-24 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <Bookmark className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
            Saved &amp; Deadline Tracker
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Sign in with your Google account to bookmark opportunities and track upcoming trial and scholarship deadlines.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="min-h-[44px] px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl cursor-pointer"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
        Saved Items &amp; Deadline Tracker
      </h1>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-52 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          <div className="h-52 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Deadline Tracker */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Deadlines
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {apps.length} tracked
              </span>
            </div>

            {apps.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No deadlines tracked yet. Open any trial, competition, or scholarship and tap “Track Deadline”.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {apps.map((app) => (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500 capitalize">
                          {app.itemType} · Due{' '}
                          <span className="font-mono font-semibold text-slate-800 tabular-nums">
                            {app.deadline}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(app.itemType, app.itemId)}
                          className="text-left font-semibold text-sm text-slate-900 hover:text-blue-700 cursor-pointer"
                        >
                          {app.title}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteApp(app.id)}
                        aria-label="Remove deadline"
                        className="min-h-[38px] min-w-[38px] text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500">Status:</label>
                      <select
                        value={app.status}
                        onChange={(e) =>
                          handleStatusChange(
                            app.id,
                            e.target.value as ApplicationRecord['status']
                          )
                        }
                        className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                      >
                        <option value="planned">Planned</option>
                        <option value="applied">Applied</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Saved Bookmarks */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-600" />
                Saved Opportunities
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {saved.length} saved
              </span>
            </div>

            {saved.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No saved opportunities yet. Tap the bookmark icon on any coach, facility, trial, or scholarship.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {saved.map((entry) => {
                  const title = entry.detail.title || entry.detail.name || 'Listing';
                  return (
                    <div
                      key={entry.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 capitalize">
                          {entry.itemType} ·{' '}
                          {SPORT_LABELS[entry.detail.sportSlug] || entry.detail.sportSlug} ·{' '}
                          {entry.detail.city}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenDetail(entry.itemType, entry.itemId)}
                          className="font-semibold text-sm text-slate-900 hover:text-blue-700 truncate block max-w-full cursor-pointer"
                        >
                          {title}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(entry.itemType, entry.itemId)}
                          aria-label="Open details"
                          className="min-h-[40px] min-w-[40px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onToggleSave(entry.itemType, entry.itemId);
                            setSaved((prev) => prev.filter((x) => x.id !== entry.id));
                          }}
                          aria-label="Remove saved item"
                          className="min-h-[40px] min-w-[40px] rounded-xl text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
