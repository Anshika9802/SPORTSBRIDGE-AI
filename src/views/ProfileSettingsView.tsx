import React, { useState } from 'react';
import { LogOut, ShieldCheck, Sliders, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { CurrencyCode, formatMonthlyPrice } from '../lib/currency.ts';
import { AppView, GOAL_LABELS, SPORT_LABELS } from '../types.ts';

interface ProfileSettingsViewProps {
  onNavigate: (view: AppView) => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  onNavigate,
}) => {
  const {
    firebaseUser,
    dbUser,
    profile,
    guestProfile,
    currency,
    updateSettings,
    logout,
  } = useAuth();
  const activeProfile = profile || guestProfile;
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCurrencyChange = async (next: CurrencyCode) => {
    setSaving(true);
    setNotice(null);
    try {
      await updateSettings({ preferredCurrency: next });
      setNotice(`Display currency updated to ${next}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (nextRole: 'athlete' | 'provider') => {
    setSaving(true);
    setNotice(null);
    try {
      await updateSettings({ role: nextRole });
      setNotice(`Account mode switched to ${nextRole}.`);
      if (nextRole === 'provider') {
        onNavigate('provider');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900">
          Profile &amp; Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage athlete details, privacy safeguards, currency preference, and provider access.
        </p>
      </div>

      {/* Athlete Summary */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {activeProfile.fullName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {firebaseUser ? firebaseUser.email : 'Guest Preview Mode'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('onboarding')}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50 inline-flex items-center gap-2 cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            Update Athlete Profile
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100 text-sm">
          <div>
            <div className="text-xs text-slate-500">Age</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums">
              {activeProfile.age} yrs
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Area</div>
            <div className="font-semibold text-slate-900">
              {activeProfile.city} ({activeProfile.pinCode})
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Skill Tier</div>
            <div className="font-semibold text-slate-900 capitalize">
              {activeProfile.skillLevel}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Monthly Budget</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatMonthlyPrice(activeProfile.monthlyBudgetInr, currency)}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div>
            <span className="font-semibold text-slate-900">Sports: </span>
            {activeProfile.sports.map((s) => SPORT_LABELS[s] || s).join(', ')}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Goals: </span>
            {activeProfile.goals.map((g) => GOAL_LABELS[g] || g).join(', ')}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Preferred Days: </span>
            {activeProfile.preferredDays.join(' · ')}
          </div>
        </div>

        {activeProfile.isMinor && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Minor protection enabled. Guardian consent recorded for{' '}
              <strong>{activeProfile.guardianName || 'Parent/Guardian'}</strong> (
              {activeProfile.guardianRelation || 'Guardian'}). Exact address and contact details are never shared publicly.
            </span>
          </div>
        )}
      </section>

      {/* Preferences */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <h2 className="font-display text-2xl font-bold text-slate-900">
          Preferences &amp; Account Mode
        </h2>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            Display Currency
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
            {(['INR', 'USD'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                type="button"
                disabled={saving}
                onClick={() => handleCurrencyChange(c)}
                className={`min-h-[40px] rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                  currency === c
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'INR' ? 'INR (₹)' : 'USD ($)'}
              </button>
            ))}
          </div>
        </div>

        {firebaseUser && (
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Workspace Role
            </span>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleRoleChange('athlete')}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer ${
                  dbUser?.role !== 'provider'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                Athlete / Parent Mode
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleRoleChange('provider')}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${
                  dbUser?.role === 'provider'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Coach / Provider Dashboard
              </button>
            </div>
          </div>
        )}

        {notice && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            {notice}
          </p>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          {firebaseUser ? (
            <button
              type="button"
              onClick={async () => {
                await logout();
                onNavigate('landing');
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-sm font-medium hover:bg-rose-50 inline-flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
