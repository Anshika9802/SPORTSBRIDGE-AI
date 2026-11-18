import React from 'react';
import {
  Award,
  Bookmark,
  Compass,
  MessageSquare,
  Search,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AppView } from '../types.ts';

interface HeaderNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ currentView, onNavigate }) => {
  const { firebaseUser, dbUser } = useAuth();

  const isLanding = currentView === 'landing';

  return (
    <>
      {/* Top Bar strictly following 3-zone contract */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Single clean wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="font-display text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            SportBridge AI
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => onNavigate('feed')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                currentView === 'feed'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              For You
            </button>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                currentView === 'search'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scholarships')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                currentView === 'scholarships'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              Scholarships
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                currentView === 'chat'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              AI Scout
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(dbUser?.role === 'provider' ? 'provider' : 'saved')
              }
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                currentView === 'saved' || currentView === 'provider'
                  ? 'border-blue-600 text-slate-900'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              {dbUser?.role === 'provider' ? 'Provider Hub' : 'Saved'}
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {isLanding ? (
              <button
                type="button"
                onClick={() => onNavigate(firebaseUser ? 'feed' : 'auth')}
                className="min-h-[40px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {firebaseUser ? 'Open Feed' : 'Sign In'}
              </button>
            ) : firebaseUser ? (
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="min-h-[40px] px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('auth')}
                className="min-h-[40px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Thumb-Zone Tab Bar (56px height, keeping total sticky <= 15% of viewport) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center"
      >
        {[
          { view: 'feed' as AppView, label: 'Feed', icon: Compass },
          { view: 'search' as AppView, label: 'Explore', icon: Search },
          { view: 'scholarships' as AppView, label: 'Grants', icon: Award },
          { view: 'chat' as AppView, label: 'AI Scout', icon: MessageSquare },
          {
            view: (firebaseUser ? 'saved' : 'auth') as AppView,
            label: firebaseUser ? 'Saved' : 'Sign In',
            icon: firebaseUser ? Bookmark : User,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = currentView === tab.view;
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => onNavigate(tab.view)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span className="text-[11px] font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
