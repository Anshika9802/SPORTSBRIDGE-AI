import React, { useState } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AppView } from '../types.ts';

interface AuthViewProps {
  onNavigate: (view: AppView) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onNavigate }) => {
  const { signInWithGoogle, updateSettings, authError, profile } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'athlete' | 'provider'>('athlete');
  const [busy, setBusy] = useState(false);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      await updateSettings({ role: selectedRole });
      if (selectedRole === 'provider') {
        onNavigate('provider');
      } else {
        onNavigate(profile ? 'feed' : 'onboarding');
      }
    } catch {
      // Handled by authError in context
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 sm:py-16 pb-24">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <h1 className="font-display text-3xl font-bold text-slate-900 mb-2">
          Sign in to SportBridge AI
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Save opportunities, track trial deadlines, store your athlete profile, or publish verified academy listings.
        </p>

        {/* Role Selector */}
        <div className="mb-6">
          <span className="block text-xs font-semibold text-slate-700 mb-2">
            I am continuing as
          </span>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedRole('athlete')}
              className={`min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                selectedRole === 'athlete'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Athlete / Parent
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('provider')}
              className={`min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                selectedRole === 'provider'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Coach / Academy
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogleSignIn}
          className="w-full min-h-[48px] px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {busy ? 'Connecting Google Account...' : 'Continue with Google'}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>

        {authError && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">
            {authError}
          </p>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Minors under 18 require parent or guardian consent during onboarding. We never publish exact home locations or personal contact details.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('onboarding')}
            className="w-full min-h-[44px] text-xs font-medium text-slate-600 hover:text-slate-900 underline cursor-pointer"
          >
            Preview onboarding &amp; recommendations as a guest first
          </button>
        </div>
      </div>
    </div>
  );
};
