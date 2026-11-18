import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { CurrencyCode } from '../lib/currency.ts';
import { AthleteProfileData, DbUser } from '../types.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  dbUser: DbUser | null;
  profile: AthleteProfileData | null;
  guestProfile: AthleteProfileData;
  currency: CurrencyCode;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshAccount: () => Promise<void>;
  saveProfile: (data: AthleteProfileData) => Promise<AthleteProfileData>;
  updateSettings: (settings: { role?: 'athlete' | 'provider'; preferredCurrency?: CurrencyCode }) => Promise<void>;
  setGuestProfile: (data: AthleteProfileData) => void;
  setCurrency: (c: CurrencyCode) => void;
}

const DEFAULT_GUEST_PROFILE: AthleteProfileData = {
  fullName: 'Aarav Sharma',
  age: 16,
  city: 'Bengaluru',
  pinCode: '560038',
  sports: ['football', 'athletics'],
  skillLevel: 'intermediate',
  monthlyBudgetInr: 2500,
  goals: ['school_team', 'state_national', 'scholarship'],
  preferredDays: ['Tue', 'Thu', 'Sat', 'Sun'],
  maxDistanceKm: 20,
  incomeBracket: '2_5l_to_5l',
  achievementLevel: 'district',
  isMinor: true,
  guardianConsent: true,
  guardianName: 'Priya Sharma',
  guardianRelation: 'Mother',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [profile, setProfile] = useState<AthleteProfileData | null>(null);
  const [guestProfile, setGuestProfile] = useState<AthleteProfileData>(DEFAULT_GUEST_PROFILE);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }, []);

  const fetchAccount = useCallback(async (user: User | null) => {
    if (!user) {
      setDbUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Could not load account data');
      }
      const data = await res.json();
      setDbUser(data.user);
      setProfile(data.profile);
      if (data.user?.preferredCurrency) {
        setCurrency(data.user.preferredCurrency);
      }
    } catch (err) {
      console.error('Account sync error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      fetchAccount(user);
    });
    return () => unsub();
  }, [fetchAccount]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      setAuthError(message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setDbUser(null);
    setProfile(null);
  };

  const refreshAccount = async () => {
    await fetchAccount(auth.currentUser);
  };

  const saveProfile = async (data: AthleteProfileData): Promise<AthleteProfileData> => {
    if (!auth.currentUser) {
      setGuestProfile(data);
      return data;
    }
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/me/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to save athlete profile');
    }
    setProfile(json.profile);
    return json.profile;
  };

  const updateSettings = async (settings: {
    role?: 'athlete' | 'provider';
    preferredCurrency?: CurrencyCode;
  }) => {
    if (settings.preferredCurrency) {
      setCurrency(settings.preferredCurrency);
    }
    if (!auth.currentUser) return;
    const token = await auth.currentUser.getIdToken();
    const res = await fetch('/api/me/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (res.ok && json.user) {
      setDbUser(json.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        profile,
        guestProfile,
        currency,
        loading,
        authError,
        signInWithGoogle,
        logout,
        getToken,
        refreshAccount,
        saveProfile,
        updateSettings,
        setGuestProfile,
        setCurrency,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
