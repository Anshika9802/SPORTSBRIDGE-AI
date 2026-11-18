import { CurrencyCode } from './lib/currency.ts';
import {
  AchievementLevel,
  IncomeBracket,
  MatchBreakdown,
  OpportunityType,
  SkillLevel,
} from './lib/matching.ts';

export type AppView =
  | 'landing'
  | 'auth'
  | 'onboarding'
  | 'feed'
  | 'search'
  | 'detail'
  | 'scholarships'
  | 'chat'
  | 'saved'
  | 'profile'
  | 'provider';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: 'athlete' | 'provider';
  preferredCurrency: CurrencyCode;
}

export interface AthleteProfileData {
  id?: number;
  userId?: number;
  fullName: string;
  age: number;
  city: string;
  pinCode: string;
  approxLat?: number;
  approxLng?: number;
  sports: string[];
  skillLevel: SkillLevel;
  monthlyBudgetInr: number;
  goals: string[];
  preferredDays: string[];
  maxDistanceKm: number;
  incomeBracket: IncomeBracket;
  achievementLevel: AchievementLevel;
  isMinor: boolean;
  guardianConsent: boolean;
  guardianName?: string | null;
  guardianRelation?: string | null;
}

export interface OpportunityItem {
  id: number;
  sportSlug: string;
  title?: string;
  name?: string;
  academyName?: string;
  facilityType?: string;
  organizer?: string;
  providerName?: string;
  level?: string;
  city: string;
  area?: string;
  venue?: string;
  pinCode?: string;
  lat: number;
  lng: number;
  monthlyFeeInr?: number;
  entryFeeInr?: number;
  awardAmountInr?: number;
  minAge: number;
  maxAge: number;
  skillLevels: string[];
  goalTags: string[];
  trainingDays?: string[];
  openDays?: string[];
  amenities?: string[];
  experienceYears?: number;
  certification?: string;
  eventDate?: string;
  trialDate?: string;
  deadline?: string;
  minAchievementLevel?: string;
  maxIncomeBracket?: string;
  eligibleCities?: string[];
  eligibilityNotes?: string;
  eligibilityChecklist?: string[];
  description: string;
  contactUrl?: string;
  applyUrl?: string;
  imageUrl?: string;
  verified: boolean;
}

export interface ScoredOpportunityCard {
  item: OpportunityItem;
  itemType: OpportunityType;
  matchScore: number;
  distanceKm: number;
  breakdown: MatchBreakdown;
  deterministicReason: string;
  aiExplanation?: string;
}

export interface SavedItemRecord {
  id: number;
  itemType: OpportunityType;
  itemId: number;
  detail: OpportunityItem;
}

export interface ApplicationRecord {
  id: number;
  itemType: OpportunityType;
  itemId: number;
  title: string;
  deadline: string;
  status: 'planned' | 'applied' | 'shortlisted' | 'completed';
  notes: string | null;
}

export const SPORT_LABELS: Record<string, string> = {
  all: 'All Sports',
  cricket: 'Cricket',
  football: 'Football',
  badminton: 'Badminton',
  athletics: 'Athletics',
  swimming: 'Swimming',
};

export const GOAL_LABELS: Record<string, string> = {
  fitness: 'Fitness & Foundation',
  school_team: 'School / College Team',
  state_national: 'State / National Level',
  scholarship: 'Sports Scholarship',
  professional: 'Pro Pathway',
};

export const INCOME_LABELS: Record<IncomeBracket, string> = {
  under_2_5l: 'Under ₹2.5 Lakh / year',
  '2_5l_to_5l': '₹2.5L – ₹5 Lakh / year',
  '5l_to_10l': '₹5L – ₹10 Lakh / year',
  above_10l: 'Above ₹10 Lakh / year',
};

export const ACHIEVEMENT_LABELS: Record<AchievementLevel, string> = {
  beginner: 'Beginner / Recreational',
  school: 'School / Inter-School',
  district: 'District Level',
  state: 'State Level',
  national: 'National Level',
};
