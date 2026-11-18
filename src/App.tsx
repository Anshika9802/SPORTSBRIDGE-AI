import { useCallback, useEffect, useState } from 'react';
import { HeaderNav } from './components/HeaderNav.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { OpportunityType } from './lib/matching.ts';
import { AppView, SavedItemRecord } from './types.ts';
import { AiChatView } from './views/AiChatView.tsx';
import { AuthView } from './views/AuthView.tsx';
import { DetailView } from './views/DetailView.tsx';
import { FeedView } from './views/FeedView.tsx';
import { LandingView } from './views/LandingView.tsx';
import { OnboardingView } from './views/OnboardingView.tsx';
import { ProfileSettingsView } from './views/ProfileSettingsView.tsx';
import { ProviderDashboardView } from './views/ProviderDashboardView.tsx';
import { SavedDeadlinesView } from './views/SavedDeadlinesView.tsx';
import { ScholarshipCheckerView } from './views/ScholarshipCheckerView.tsx';
import { SearchView } from './views/SearchView.tsx';

function SportBridgeShell() {
  const { firebaseUser, getToken } = useAuth();
  const [view, setView] = useState<AppView>('landing');
  const [previousView, setPreviousView] = useState<AppView>('feed');
  const [selectedDetail, setSelectedDetail] = useState<{
    type: OpportunityType;
    id: number;
  } | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<{
    type: OpportunityType;
    id: number;
    title: string;
  } | null>(null);

  const loadSavedKeys = useCallback(async () => {
    if (!firebaseUser) {
      setSavedKeys(new Set());
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch('/api/saved', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const items = (await res.json()) as SavedItemRecord[];
        setSavedKeys(new Set(items.map((i) => `${i.itemType}:${i.itemId}`)));
      }
    } catch {
      // Non-blocking bookmark sync
    }
  }, [firebaseUser, getToken]);

  useEffect(() => {
    loadSavedKeys();
  }, [loadSavedKeys]);

  const handleNavigate = (next: AppView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDetail = (type: OpportunityType, id: number) => {
    if (view !== 'detail') {
      setPreviousView(view);
    }
    setSelectedDetail({ type, id });
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSave = async (type: OpportunityType, id: number) => {
    if (!firebaseUser) {
      handleNavigate('auth');
      return;
    }
    const key = `${type}:${id}`;
    const alreadySaved = savedKeys.has(key);
    const token = await getToken();

    // Optimistic toggle
    setSavedKeys((prev) => {
      const next = new Set(prev);
      if (alreadySaved) next.delete(key);
      else next.add(key);
      return next;
    });

    const res = alreadySaved
      ? await fetch(`/api/saved/${type}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      : await fetch('/api/saved', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemType: type, itemId: id }),
        });

    if (!res.ok) {
      await loadSavedKeys();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeaderNav currentView={view} onNavigate={handleNavigate} />

      <main>
        {view === 'landing' && <LandingView onNavigate={handleNavigate} />}
        {view === 'auth' && <AuthView onNavigate={handleNavigate} />}
        {view === 'onboarding' && <OnboardingView onNavigate={handleNavigate} />}
        {view === 'feed' && (
          <FeedView
            savedKeys={savedKeys}
            onToggleSave={handleToggleSave}
            onOpenDetail={handleOpenDetail}
            onReport={(type, id, title) => setReportTarget({ type, id, title })}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'search' && (
          <SearchView
            savedKeys={savedKeys}
            onToggleSave={handleToggleSave}
            onOpenDetail={handleOpenDetail}
            onReport={(type, id, title) => setReportTarget({ type, id, title })}
          />
        )}
        {view === 'detail' && selectedDetail && (
          <DetailView
            itemType={selectedDetail.type}
            itemId={selectedDetail.id}
            isSaved={savedKeys.has(`${selectedDetail.type}:${selectedDetail.id}`)}
            onToggleSave={handleToggleSave}
            onReport={(type, id, title) => setReportTarget({ type, id, title })}
            onBack={() => handleNavigate(previousView)}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'scholarships' && (
          <ScholarshipCheckerView onOpenDetail={handleOpenDetail} />
        )}
        {view === 'chat' && <AiChatView onOpenDetail={handleOpenDetail} />}
        {view === 'saved' && (
          <SavedDeadlinesView
            onOpenDetail={handleOpenDetail}
            onToggleSave={handleToggleSave}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'profile' && <ProfileSettingsView onNavigate={handleNavigate} />}
        {view === 'provider' && <ProviderDashboardView onNavigate={handleNavigate} />}
      </main>

      <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SportBridgeShell />
    </AuthProvider>
  );
}
