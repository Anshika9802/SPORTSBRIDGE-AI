import { calculateDistanceKm } from './cities.ts';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type GoalType = 'fitness' | 'school_team' | 'state_national' | 'scholarship' | 'professional';
export type AchievementLevel = 'beginner' | 'school' | 'district' | 'state' | 'national';
export type IncomeBracket = 'under_2_5l' | '2_5l_to_5l' | '5l_to_10l' | 'above_10l';
export type OpportunityType = 'coach' | 'facility' | 'competition' | 'trial' | 'scholarship';

export interface AthleteMatchProfile {
  age: number;
  city: string;
  approxLat: number;
  approxLng: number;
  sports: string[];
  skillLevel: SkillLevel;
  monthlyBudgetInr: number;
  goals: string[];
  preferredDays: string[];
  maxDistanceKm: number;
  incomeBracket?: IncomeBracket;
  achievementLevel?: AchievementLevel;
}

export interface MatchBreakdown {
  skillFit: number; // max 25
  goalAlignment: number; // max 25
  affordability: number; // max 20
  distance: number; // max 15
  timing: number; // max 15
}

export interface ScoredOpportunity<T> {
  item: T;
  itemType: OpportunityType;
  matchScore: number; // 0-100
  distanceKm: number;
  breakdown: MatchBreakdown;
  deterministicReason: string;
  aiExplanation?: string;
}

export interface CandidateAttributes {
  sportSlug: string;
  city: string;
  lat: number;
  lng: number;
  priceInr: number;
  minAge: number;
  maxAge: number;
  skillLevels: string[];
  goalTags: string[];
  days: string[];
  isPanIndia?: boolean;
  isScholarship?: boolean;
}

const SKILL_ORDER: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'elite'];
const ACHIEVEMENT_ORDER: AchievementLevel[] = ['beginner', 'school', 'district', 'state', 'national'];
const INCOME_ORDER: IncomeBracket[] = ['under_2_5l', '2_5l_to_5l', '5l_to_10l', 'above_10l'];

/**
 * Deterministic Hard Filters + Weighted Scoring Engine (0-100):
 * - Hard filters: sport, age eligibility, budget ceiling, distance limit
 * - Weighted score: skill-level fit (25%), goal alignment (25%),
 *   affordability (20%), distance (15%), timing/availability (15%)
 */
export function evaluateOpportunityMatch<T>(
  profile: AthleteMatchProfile,
  item: T,
  itemType: OpportunityType,
  attrs: CandidateAttributes,
  options?: { enforceHardFilters?: boolean }
): ScoredOpportunity<T> | null {
  const enforceHardFilters = options?.enforceHardFilters ?? true;

  const isPanIndia = attrs.isPanIndia || attrs.city.toLowerCase() === 'pan-india';
  const distanceKm = isPanIndia
    ? 0
    : calculateDistanceKm(profile.approxLat, profile.approxLng, attrs.lat, attrs.lng);

  // 1. Hard Filters
  const sportMatches =
    attrs.sportSlug === 'all' ||
    profile.sports.length === 0 ||
    profile.sports.includes(attrs.sportSlug);

  const ageMatches = profile.age >= attrs.minAge && profile.age <= attrs.maxAge;

  // Scholarships are awards (income/grant), not monthly expense; competitions/trials are one-time entry fees
  const effectiveBudgetLimit =
    attrs.isScholarship
      ? Infinity
      : itemType === 'competition' || itemType === 'trial'
      ? Math.max(profile.monthlyBudgetInr, 1500)
      : profile.monthlyBudgetInr;

  const budgetMatches = attrs.priceInr <= effectiveBudgetLimit;
  const distanceMatches = isPanIndia || distanceKm <= profile.maxDistanceKm;

  if (enforceHardFilters && (!sportMatches || !ageMatches || !budgetMatches || !distanceMatches)) {
    return null;
  }

  // 2. Weighted Scoring (0-100)
  // A. Skill-level fit (25%)
  let skillFit = 0;
  if (attrs.skillLevels.includes(profile.skillLevel)) {
    skillFit = 25;
  } else {
    const userIdx = SKILL_ORDER.indexOf(profile.skillLevel);
    const minDiff = Math.min(
      ...attrs.skillLevels.map((s) => {
        const idx = SKILL_ORDER.indexOf(s as SkillLevel);
        return idx === -1 ? 3 : Math.abs(idx - userIdx);
      })
    );
    skillFit = minDiff === 1 ? 15 : minDiff === 2 ? 7 : 0;
  }

  // B. Goal alignment (25%)
  const goalOverlap = profile.goals.filter((g) => attrs.goalTags.includes(g)).length;
  const goalAlignment =
    profile.goals.length > 0
      ? Math.round(Math.min(1, goalOverlap / Math.min(profile.goals.length, 2)) * 25)
      : 15;

  // C. Affordability (20%)
  let affordability = 20;
  if (!attrs.isScholarship) {
    if (attrs.priceInr === 0) {
      affordability = 20;
    } else if (profile.monthlyBudgetInr <= 0) {
      affordability = 0;
    } else if (attrs.priceInr <= profile.monthlyBudgetInr) {
      const ratio = attrs.priceInr / Math.max(1, profile.monthlyBudgetInr);
      affordability = Math.round(20 - ratio * 6); // 14-20 pts when within budget
    } else {
      const overRatio = (attrs.priceInr - profile.monthlyBudgetInr) / Math.max(1, profile.monthlyBudgetInr);
      affordability = Math.max(0, Math.round(10 - overRatio * 10));
    }
  }

  // D. Distance (15%)
  let distanceScore = 15;
  if (!isPanIndia) {
    if (distanceKm <= 3) distanceScore = 15;
    else if (distanceKm <= 7) distanceScore = 12;
    else if (distanceKm <= 12) distanceScore = 9;
    else if (distanceKm <= profile.maxDistanceKm) distanceScore = 6;
    else distanceScore = 2;
  }

  // E. Timing / Availability (15%)
  let timingScore = 15;
  if (attrs.days.length > 0 && profile.preferredDays.length > 0) {
    const dayMatches = profile.preferredDays.filter((d) => attrs.days.includes(d)).length;
    timingScore = Math.round(Math.min(1, dayMatches / Math.min(profile.preferredDays.length, 3)) * 15);
  }

  const totalScore = Math.min(
    100,
    Math.max(0, skillFit + goalAlignment + affordability + distanceScore + timingScore)
  );

  const reasons: string[] = [];
  if (skillFit >= 20) reasons.push(`fits your ${profile.skillLevel} skill tier`);
  if (goalOverlap > 0) reasons.push('aligns with your athletic goals');
  if (attrs.isScholarship) reasons.push('offers financial aid with no fee');
  else if (attrs.priceInr <= profile.monthlyBudgetInr) reasons.push('fits within your budget');
  if (isPanIndia) reasons.push('open Pan-India');
  else if (distanceKm <= 8) reasons.push(`just ${distanceKm} km from ${profile.city}`);

  const deterministicReason =
    reasons.length > 0
      ? `Matches your profile because it ${reasons.slice(0, 3).join(', ')}.`
      : 'Available in your selected sport and age bracket.';

  return {
    item,
    itemType,
    matchScore: totalScore,
    distanceKm,
    breakdown: {
      skillFit,
      goalAlignment,
      affordability,
      distance: distanceScore,
      timing: timingScore,
    },
    deterministicReason,
  };
}

export interface ScholarshipEligibilityInput {
  age: number;
  sports: string[];
  achievementLevel: AchievementLevel;
  incomeBracket: IncomeBracket;
  city: string;
}

export interface ScholarshipCriterionResult {
  criterion: string;
  passed: boolean | 'partial';
  detail: string;
}

export interface ScholarshipEligibilityEvaluation {
  scholarshipId: number;
  status: 'Likely eligible' | 'Maybe' | 'Not eligible';
  score: number;
  criteria: ScholarshipCriterionResult[];
  summary: string;
}

export function evaluateScholarshipEligibility(
  input: ScholarshipEligibilityInput,
  scholarship: {
    id: number;
    sportSlug: string;
    minAge: number;
    maxAge: number;
    minAchievementLevel: string;
    maxIncomeBracket: string;
    eligibleCities: string[];
  }
): ScholarshipEligibilityEvaluation {
  const criteria: ScholarshipCriterionResult[] = [];
  let hardFail = false;
  let partialFlag = false;

  // 1. Age
  const agePass = input.age >= scholarship.minAge && input.age <= scholarship.maxAge;
  if (!agePass) hardFail = true;
  criteria.push({
    criterion: 'Age bracket',
    passed: agePass,
    detail: agePass
      ? `Age ${input.age} is within ${scholarship.minAge}–${scholarship.maxAge} yrs.`
      : `Requires age ${scholarship.minAge}–${scholarship.maxAge} yrs (you entered ${input.age}).`,
  });

  // 2. Sport
  const sportPass =
    scholarship.sportSlug === 'all' || input.sports.includes(scholarship.sportSlug);
  if (!sportPass) hardFail = true;
  criteria.push({
    criterion: 'Sport discipline',
    passed: sportPass,
    detail: sportPass
      ? scholarship.sportSlug === 'all'
        ? 'Open across recognized Olympic & national sports.'
        : `Covers ${scholarship.sportSlug}.`
      : `Restricted to ${scholarship.sportSlug} athletes.`,
  });

  // 3. Achievement level
  const athleteAchIdx = ACHIEVEMENT_ORDER.indexOf(input.achievementLevel);
  const reqAchIdx = ACHIEVEMENT_ORDER.indexOf(scholarship.minAchievementLevel as AchievementLevel);
  let achStatus: boolean | 'partial' = true;
  if (athleteAchIdx < reqAchIdx) {
    if (reqAchIdx - athleteAchIdx === 1) {
      achStatus = 'partial';
      partialFlag = true;
    } else {
      achStatus = false;
      hardFail = true;
    }
  }
  criteria.push({
    criterion: 'Achievement level',
    passed: achStatus,
    detail:
      achStatus === true
        ? `Meets minimum ${scholarship.minAchievementLevel} level requirement.`
        : achStatus === 'partial'
        ? `Prefers ${scholarship.minAchievementLevel} level; your ${input.achievementLevel} level may still qualify via trials.`
        : `Requires at least ${scholarship.minAchievementLevel}-level participation.`,
  });

  // 4. Household income bracket
  const athleteIncIdx = INCOME_ORDER.indexOf(input.incomeBracket);
  const maxIncIdx = INCOME_ORDER.indexOf(scholarship.maxIncomeBracket as IncomeBracket);
  let incStatus: boolean | 'partial' = true;
  if (athleteIncIdx > maxIncIdx) {
    if (athleteIncIdx - maxIncIdx === 1) {
      incStatus = 'partial';
      partialFlag = true;
    } else {
      incStatus = false;
      hardFail = true;
    }
  }
  criteria.push({
    criterion: 'Family income threshold',
    passed: incStatus,
    detail:
      incStatus === true
        ? 'Within annual household income guideline.'
        : incStatus === 'partial'
        ? 'Slightly above standard income preference; merit exceptions may apply.'
        : 'Exceeds financial-need income cap for this grant.',
  });

  // 5. Location
  const panIndia = scholarship.eligibleCities.some((c) => c.toLowerCase() === 'pan-india');
  const cityPass =
    panIndia ||
    scholarship.eligibleCities.some(
      (c) => c.toLowerCase() === input.city.trim().toLowerCase()
    );
  if (!cityPass) hardFail = true;
  criteria.push({
    criterion: 'Location eligibility',
    passed: cityPass,
    detail: panIndia
      ? 'Open Pan-India across all states.'
      : cityPass
      ? `Open to athletes in ${input.city}.`
      : `Restricted to ${scholarship.eligibleCities.join(', ')}.`,
  });

  const status: 'Likely eligible' | 'Maybe' | 'Not eligible' = hardFail
    ? 'Not eligible'
    : partialFlag
    ? 'Maybe'
    : 'Likely eligible';

  const passCount = criteria.filter((c) => c.passed === true).length;
  const partialCount = criteria.filter((c) => c.passed === 'partial').length;
  const score = Math.round(((passCount + partialCount * 0.5) / criteria.length) * 100);

  const summary =
    status === 'Likely eligible'
      ? 'You meet all core age, sport, achievement, income, and location criteria.'
      : status === 'Maybe'
      ? 'You satisfy the core gates and may qualify subject to trial performance or merit review.'
      : 'One or more mandatory eligibility criteria are not met.';

  return {
    scholarshipId: scholarship.id,
    status,
    score,
    criteria,
    summary,
  };
}
