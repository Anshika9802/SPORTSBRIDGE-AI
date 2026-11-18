import React, { useState } from 'react';
import { ShieldCheck, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { INDIAN_CITIES } from '../lib/cities.ts';
import { formatMonthlyPrice } from '../lib/currency.ts';
import { AchievementLevel, IncomeBracket, SkillLevel } from '../lib/matching.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ACHIEVEMENT_LABELS,
  AppView,
  AthleteProfileData,
  GOAL_LABELS,
  INCOME_LABELS,
  SPORT_LABELS,
} from '../types.ts';

interface OnboardingViewProps {
  onNavigate: (view: AppView) => void;
}

const SPORTS_LIST = ['cricket', 'football', 'badminton', 'athletics', 'swimming'];
const DAYS_LIST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onNavigate }) => {
  const { profile, guestProfile, saveProfile, firebaseUser, currency } = useAuth();
  const initial = profile || guestProfile;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AthleteProfileData>({
    ...initial,
    isMinor: initial.age < 18,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMinor = form.age < 18;
  const totalSteps = 4;

  const toggleArrayItem = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!form.fullName.trim()) {
        setError('Please enter the athlete’s name.');
        return;
      }
      if (form.age < 10 || form.age > 25) {
        setError('SportBridge AI supports youth athletes aged 10–25.');
        return;
      }
      if (!/^\d{6}$/.test(form.pinCode.trim())) {
        setError('Please enter a valid 6-digit Indian pin code.');
        return;
      }
    }
    if (step === 2 && isMinor) {
      if (!form.guardianName?.trim() || !form.guardianConsent) {
        setError(
          'Parent or guardian name and consent are mandatory for athletes under 18.'
        );
        return;
      }
    }
    if (step === 3 && form.sports.length === 0) {
      setError('Select at least one sport.');
      return;
    }
    setStep((s) => Math.min(totalSteps, s + 1));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.goals.length === 0) {
      setError('Please pick at least one athletic goal.');
      return;
    }
    if (form.preferredDays.length === 0) {
      setError('Select at least one preferred training day.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        ...form,
        isMinor,
        guardianConsent: isMinor ? form.guardianConsent : true,
      });
      onNavigate('feed');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        {/* Step Progress Header */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-xs font-semibold text-blue-700">
            Step {step} of {totalSteps}
          </span>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {Math.round((step / totalSteps) * 100)}% complete
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <form onSubmit={handleFinish}>
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">
                  Athlete Profile Basics
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Tell us your age and neighborhood area so we only show eligible nearby opportunities.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Athlete Full Name
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g., Aarav Sharma"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Age (10–25 years)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={25}
                    value={form.age}
                    onChange={(e) => {
                      const nextAge = Number(e.target.value);
                      setForm({ ...form, age: nextAge, isMinor: nextAge < 18 });
                    }}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    City
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => {
                      const c = INDIAN_CITIES.find((x) => x.city === e.target.value);
                      setForm({
                        ...form,
                        city: e.target.value,
                        pinCode: c?.samplePinCodes[0] || form.pinCode,
                      });
                    }}
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Pin Code (area centroid only)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={form.pinCode}
                  onChange={(e) => setForm({ ...form, pinCode: e.target.value })}
                  placeholder="560038"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm font-mono tabular-nums text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Privacy safeguard: We never collect street addresses or share a minor’s exact coordinates publicly.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">
                  {isMinor ? 'Parent / Guardian Consent' : 'Safety & Privacy Verification'}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {isMinor
                    ? 'Because the athlete is under 18, a parent or legal guardian must authorize profile creation.'
                    : 'Your contact details remain private and are never exposed on public listings.'}
                </p>
              </div>

              {isMinor ? (
                <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Minor Protection Active (Age {form.age}): Guardian confirmation is required before matching with coaches or trials.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Parent / Guardian Full Name
                      </label>
                      <input
                        type="text"
                        value={form.guardianName || ''}
                        onChange={(e) =>
                          setForm({ ...form, guardianName: e.target.value })
                        }
                        placeholder="e.g., Priya Sharma"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Relationship
                      </label>
                      <select
                        value={form.guardianRelation || 'Parent'}
                        onChange={(e) =>
                          setForm({ ...form, guardianRelation: e.target.value })
                        }
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white"
                      >
                        <option value="Mother">Mother</option>
                        <option value="Father">Father</option>
                        <option value="Legal Guardian">Legal Guardian</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={form.guardianConsent}
                      onChange={(e) =>
                        setForm({ ...form, guardianConsent: e.target.checked })
                      }
                      className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      I confirm I am the parent or legal guardian of {form.fullName || 'this athlete'} and consent to receiving personalized sports coaching, trial, and scholarship recommendations.
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">
                    Adult athlete mode (Age {form.age}). Your approximate pin-code centroid is used only for distance calculation and is never shown publicly.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">
                  Sports &amp; Current Level
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Pick the sports you train in and your current competitive experience.
                </p>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Sport(s)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SPORTS_LIST.map((slug) => {
                    const selected = form.sports.includes(slug);
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            sports: toggleArrayItem(form.sports, slug),
                          })
                        }
                        className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          selected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{SPORT_LABELS[slug]}</span>
                        {selected && <Check className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Skill Level
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['beginner', 'intermediate', 'advanced', 'elite'] as SkillLevel[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setForm({ ...form, skillLevel: lvl })}
                        className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-medium capitalize transition-colors cursor-pointer ${
                          form.skillLevel === lvl
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {lvl}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Highest Achievement So Far (used for scholarships)
                </label>
                <select
                  value={form.achievementLevel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      achievementLevel: e.target.value as AchievementLevel,
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                >
                  {(Object.keys(ACHIEVEMENT_LABELS) as AchievementLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {ACHIEVEMENT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold text-slate-900">
                  Budget, Goals &amp; Schedule
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  We never recommend monthly coaching above your ceiling.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Monthly Budget Ceiling ({formatMonthlyPrice(form.monthlyBudgetInr, currency)})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={6000}
                    step={250}
                    value={form.monthlyBudgetInr}
                    onChange={(e) =>
                      setForm({ ...form, monthlyBudgetInr: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 font-mono tabular-nums mt-1">
                    <span>₹0</span>
                    <span>₹3,000</span>
                    <span>₹6,000</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Max Commute Distance ({form.maxDistanceKm} km)
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={40}
                    step={5}
                    value={form.maxDistanceKm}
                    onChange={(e) =>
                      setForm({ ...form, maxDistanceKm: Number(e.target.value) })
                    }
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 font-mono tabular-nums mt-1">
                    <span>5 km</span>
                    <span>20 km</span>
                    <span>40 km</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Primary Goals
                </span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GOAL_LABELS).map(([k, label]) => {
                    const active = form.goals.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setForm({ ...form, goals: toggleArrayItem(form.goals, k) })
                        }
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  Preferred Training Days
                </span>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_LIST.map((day) => {
                    const active = form.preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            preferredDays: toggleArrayItem(form.preferredDays, day),
                          })
                        }
                        className={`min-h-[44px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Annual Family Income Bracket (for Scholarship Eligibility Check)
                </label>
                <select
                  value={form.incomeBracket}
                  onChange={(e) =>
                    setForm({ ...form, incomeBracket: e.target.value as IncomeBracket })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900"
                >
                  {(Object.keys(INCOME_LABELS) as IncomeBracket[]).map((k) => (
                    <option key={k} value={k}>
                      {INCOME_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                Continue
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {saving
                  ? 'Saving Profile...'
                  : firebaseUser
                  ? 'Save & See My Matches'
                  : 'Preview My Matches'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
