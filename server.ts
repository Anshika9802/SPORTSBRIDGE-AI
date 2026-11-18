import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import {
  coaches,
  competitions,
  facilities,
  scholarships,
  trials,
} from './src/db/schema.ts';
import {
  addApplication,
  addSavedItem,
  createListingReport,
  deleteApplication,
  getAllOpportunities,
  getAllSports,
  getApplicationsByUser,
  getAthleteProfileByUserId,
  getOpportunityByTypeAndId,
  getProviderListings,
  getSavedItemsByUser,
  getUserById,
  removeSavedItem,
  updateApplicationStatus,
  updateUserSettings,
  upsertAthleteProfile,
} from './src/db/queries.ts';
import { seedDatabase, SPORT_IMAGES } from './src/db/seed-data.ts';
import { resolveApproxCoordinates } from './src/lib/cities.ts';
import {
  generateChatSummary,
  generateMatchExplanations,
  parseNaturalLanguageQuery,
} from './src/lib/gemini.ts';
import {
  AthleteMatchProfile,
  evaluateOpportunityMatch,
  evaluateScholarshipEligibility,
  OpportunityType,
  ScoredOpportunity,
  SkillLevel,
} from './src/lib/matching.ts';
import { AuthRequest, optionalAuth, requireAuth } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

let seedEnsured = false;
async function ensureSeededOnRequest() {
  if (seedEnsured) return;
  try {
    await seedDatabase();
    seedEnsured = true;
  } catch (err) {
    console.error('Lazy seed check error:', err);
  }
}

function buildDefaultProfile(query: Record<string, unknown>): AthleteMatchProfile {
  const city = typeof query.city === 'string' && query.city ? query.city : 'Bengaluru';
  const pinCode = typeof query.pinCode === 'string' ? query.pinCode : undefined;
  const coords = resolveApproxCoordinates(city, pinCode);
  const sportsParam =
    typeof query.sports === 'string' && query.sports.length > 0
      ? query.sports.split(',').map((s) => s.trim().toLowerCase())
      : ['football', 'cricket', 'badminton', 'athletics', 'swimming'];
  const goalsParam =
    typeof query.goals === 'string' && query.goals.length > 0
      ? query.goals.split(',').map((g) => g.trim())
      : ['fitness', 'school_team', 'scholarship'];
  const daysParam =
    typeof query.preferredDays === 'string' && query.preferredDays.length > 0
      ? query.preferredDays.split(',').map((d) => d.trim())
      : ['Mon', 'Wed', 'Fri', 'Sat', 'Sun'];

  return {
    age: query.age ? Number(query.age) : 16,
    city: coords.matchedCity,
    approxLat: coords.lat,
    approxLng: coords.lng,
    sports: sportsParam,
    skillLevel: (typeof query.skillLevel === 'string'
      ? query.skillLevel
      : 'intermediate') as SkillLevel,
    monthlyBudgetInr: query.monthlyBudgetInr ? Number(query.monthlyBudgetInr) : 3000,
    goals: goalsParam,
    preferredDays: daysParam,
    maxDistanceKm: query.maxDistanceKm ? Number(query.maxDistanceKm) : 25,
  };
}

function scoreAllOpportunities(
  profile: AthleteMatchProfile,
  allData: Awaited<ReturnType<typeof getAllOpportunities>>,
  enforceHardFilters = true
) {
  const coachMatches = allData.coaches
    .map((c) =>
      evaluateOpportunityMatch(
        profile,
        c,
        'coach',
        {
          sportSlug: c.sportSlug,
          city: c.city,
          lat: c.lat,
          lng: c.lng,
          priceInr: c.monthlyFeeInr,
          minAge: c.minAge,
          maxAge: c.maxAge,
          skillLevels: c.skillLevels,
          goalTags: c.goalTags,
          days: c.trainingDays,
        },
        { enforceHardFilters }
      )
    )
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  const facilityMatches = allData.facilities
    .map((f) =>
      evaluateOpportunityMatch(
        profile,
        f,
        'facility',
        {
          sportSlug: f.sportSlug,
          city: f.city,
          lat: f.lat,
          lng: f.lng,
          priceInr: f.monthlyFeeInr,
          minAge: f.minAge,
          maxAge: f.maxAge,
          skillLevels: f.skillLevels,
          goalTags: f.goalTags,
          days: f.openDays,
        },
        { enforceHardFilters }
      )
    )
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  const competitionMatches = allData.competitions
    .map((comp) =>
      evaluateOpportunityMatch(
        profile,
        comp,
        'competition',
        {
          sportSlug: comp.sportSlug,
          city: comp.city,
          lat: comp.lat,
          lng: comp.lng,
          priceInr: comp.entryFeeInr,
          minAge: comp.minAge,
          maxAge: comp.maxAge,
          skillLevels: comp.skillLevels,
          goalTags: comp.goalTags,
          days: [],
        },
        { enforceHardFilters }
      )
    )
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const trialMatches = allData.trials
    .map((tr) =>
      evaluateOpportunityMatch(
        profile,
        tr,
        'trial',
        {
          sportSlug: tr.sportSlug,
          city: tr.city,
          lat: tr.lat,
          lng: tr.lng,
          priceInr: tr.entryFeeInr,
          minAge: tr.minAge,
          maxAge: tr.maxAge,
          skillLevels: tr.skillLevels,
          goalTags: tr.goalTags,
          days: [],
        },
        { enforceHardFilters }
      )
    )
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const competitionsAndTrials = [...competitionMatches, ...trialMatches].sort(
    (a, b) => b.matchScore - a.matchScore
  );

  const scholarshipMatches = allData.scholarships
    .map((sch) =>
      evaluateOpportunityMatch(
        profile,
        sch,
        'scholarship',
        {
          sportSlug: sch.sportSlug,
          city: sch.city,
          lat: sch.lat,
          lng: sch.lng,
          priceInr: 0,
          minAge: sch.minAge,
          maxAge: sch.maxAge,
          skillLevels: sch.skillLevels,
          goalTags: sch.goalTags,
          days: [],
          isPanIndia: sch.eligibleCities.some((c) => c.toLowerCase() === 'pan-india'),
          isScholarship: true,
        },
        { enforceHardFilters }
      )
    )
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    coaches: coachMatches,
    facilities: facilityMatches,
    competitionsAndTrials,
    scholarships: scholarshipMatches,
  };
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SportBridge AI' });
});

// Sports catalog
app.get('/api/sports', async (_req, res) => {
  try {
    await ensureSeededOnRequest();
    const rows = await getAllSports();
    res.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load sports';
    res.status(500).json({ error: message });
  }
});

// Current authenticated user + athlete profile
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const user = await getUserById(req.dbUserId!);
    const profile = await getAthleteProfileByUserId(req.dbUserId!);
    res.json({ user, profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load profile';
    res.status(500).json({ error: message });
  }
});

// Save or update athlete profile (enforces guardian consent for minors < 18)
app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const age = Number(body.age);
    if (!body.fullName || !Number.isFinite(age) || age < 10 || age > 25) {
      return res
        .status(400)
        .json({ error: 'Valid full name and athlete age (10–25) are required.' });
    }
    const isMinor = age < 18;
    const guardianConsent = Boolean(body.guardianConsent);
    if (isMinor && !guardianConsent) {
      return res.status(400).json({
        error:
          'Parent or guardian consent is mandatory for athletes under 18 years of age.',
      });
    }
    const city = String(body.city || 'Bengaluru');
    const pinCode = String(body.pinCode || '560001');
    const coords = resolveApproxCoordinates(city, pinCode);

    const saved = await upsertAthleteProfile(req.dbUserId!, {
      fullName: String(body.fullName).trim(),
      age,
      city: coords.matchedCity,
      pinCode: pinCode.trim(),
      approxLat: coords.lat,
      approxLng: coords.lng,
      sports: Array.isArray(body.sports) && body.sports.length > 0 ? body.sports : ['football'],
      skillLevel: String(body.skillLevel || 'intermediate'),
      monthlyBudgetInr: Math.max(0, Number(body.monthlyBudgetInr ?? 2000)),
      goals: Array.isArray(body.goals) && body.goals.length > 0 ? body.goals : ['fitness'],
      preferredDays:
        Array.isArray(body.preferredDays) && body.preferredDays.length > 0
          ? body.preferredDays
          : ['Mon', 'Wed', 'Fri'],
      maxDistanceKm: Math.max(2, Math.min(50, Number(body.maxDistanceKm ?? 15))),
      incomeBracket: String(body.incomeBracket || '2_5l_to_5l'),
      achievementLevel: String(body.achievementLevel || 'school'),
      isMinor,
      guardianConsent: isMinor ? guardianConsent : true,
      guardianName: isMinor ? String(body.guardianName || '').trim() || null : null,
      guardianRelation: isMinor ? String(body.guardianRelation || '').trim() || null : null,
    });

    res.json({ profile: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save profile';
    res.status(500).json({ error: message });
  }
});

// Update user settings (role switch athlete/provider, preferred currency INR/USD)
app.put('/api/me/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { role, preferredCurrency } = req.body ?? {};
    const updates: { role?: string; preferredCurrency?: string } = {};
    if (role === 'athlete' || role === 'provider') updates.role = role;
    if (preferredCurrency === 'INR' || preferredCurrency === 'USD') {
      updates.preferredCurrency = preferredCurrency;
    }
    const updated = await updateUserSettings(req.dbUserId!, updates);
    res.json({ user: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    res.status(500).json({ error: message });
  }
});

// Personalized recommendations feed (Coaches, Facilities, Competitions & Trials, Scholarships)
app.get('/api/recommendations', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const dbProfile = req.dbUserId
      ? await getAthleteProfileByUserId(req.dbUserId)
      : null;

    const hasQueryOverride =
      Boolean(req.query.city) || Boolean(req.query.sports) || Boolean(req.query.age);

    const profile: AthleteMatchProfile =
      dbProfile && !hasQueryOverride
        ? {
            age: dbProfile.age,
            city: dbProfile.city,
            approxLat: dbProfile.approxLat,
            approxLng: dbProfile.approxLng,
            sports: dbProfile.sports,
            skillLevel: dbProfile.skillLevel as SkillLevel,
            monthlyBudgetInr: dbProfile.monthlyBudgetInr,
            goals: dbProfile.goals,
            preferredDays: dbProfile.preferredDays,
            maxDistanceKm: dbProfile.maxDistanceKm,
          }
        : buildDefaultProfile(req.query as Record<string, unknown>);

    const allData = await getAllOpportunities();
    const scored = scoreAllOpportunities(profile, allData, true);

    // Enrich top items per category with Gemini AI explanations if requested
    if (req.query.explain !== 'false') {
      const topToExplain: Array<{
        idKey: string;
        title: string;
        sport: string;
        city: string;
        priceInr: number;
        matchScore: number;
        deterministicReason: string;
      }> = [];

      const collect = (list: Array<ScoredOpportunity<any>>, limit: number) => {
        for (const entry of list.slice(0, limit)) {
          const title = entry.item.title || entry.item.name;
          const priceInr =
            entry.item.monthlyFeeInr ?? entry.item.entryFeeInr ?? 0;
          topToExplain.push({
            idKey: `${entry.itemType}:${entry.item.id}`,
            title,
            sport: entry.item.sportSlug,
            city: entry.item.city,
            priceInr,
            matchScore: entry.matchScore,
            deterministicReason: entry.deterministicReason,
          });
        }
      };

      collect(scored.coaches, 4);
      collect(scored.facilities, 4);
      collect(scored.competitionsAndTrials, 4);
      collect(scored.scholarships, 4);

      const athleteSummary = `Age ${profile.age}, City ${profile.city}, Sports [${profile.sports.join(', ')}], Skill ${profile.skillLevel}, Budget ₹${profile.monthlyBudgetInr}/mo, Goals [${profile.goals.join(', ')}]`;
      try {
        const aiMap = await generateMatchExplanations(athleteSummary, topToExplain);
        const applyAi = (list: Array<ScoredOpportunity<any>>) =>
          list.map((entry) => ({
            ...entry,
            aiExplanation:
              aiMap[`${entry.itemType}:${entry.item.id}`] || entry.deterministicReason,
          }));
        scored.coaches = applyAi(scored.coaches);
        scored.facilities = applyAi(scored.facilities);
        scored.competitionsAndTrials = applyAi(scored.competitionsAndTrials);
        scored.scholarships = applyAi(scored.scholarships);
      } catch (aiErr) {
        console.warn('Gemini match explanation skipped:', aiErr);
      }
    }

    res.json({
      profileUsed: {
        city: profile.city,
        age: profile.age,
        sports: profile.sports,
        skillLevel: profile.skillLevel,
        monthlyBudgetInr: profile.monthlyBudgetInr,
        maxDistanceKm: profile.maxDistanceKm,
      },
      recommendations: scored,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to compute recommendations';
    res.status(500).json({ error: message });
  }
});

// Smart search & filters across all opportunity categories
app.get('/api/opportunities/search', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const dbProfile = req.dbUserId
      ? await getAthleteProfileByUserId(req.dbUserId)
      : null;

    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : 'all';
    const sportFilter =
      typeof req.query.sport === 'string' && req.query.sport !== 'all'
        ? req.query.sport.toLowerCase()
        : null;
    const cityFilter =
      typeof req.query.city === 'string' && req.query.city !== 'all'
        ? req.query.city.trim()
        : null;
    const maxPriceInr = req.query.maxPriceInr ? Number(req.query.maxPriceInr) : null;
    const maxDistanceKm = req.query.maxDistanceKm
      ? Number(req.query.maxDistanceKm)
      : null;
    const ageFilter = req.query.age ? Number(req.query.age) : null;
    const skillFilter =
      typeof req.query.skillLevel === 'string' && req.query.skillLevel !== 'all'
        ? req.query.skillLevel.toLowerCase()
        : null;
    const dateBefore =
      typeof req.query.dateBefore === 'string' && req.query.dateBefore
        ? req.query.dateBefore
        : null;

    const referenceCity = cityFilter || dbProfile?.city || 'Bengaluru';
    const coords = resolveApproxCoordinates(referenceCity, dbProfile?.pinCode);
    const matchProfile: AthleteMatchProfile = dbProfile
      ? {
          age: ageFilter ?? dbProfile.age,
          city: coords.matchedCity,
          approxLat: cityFilter ? coords.lat : dbProfile.approxLat,
          approxLng: cityFilter ? coords.lng : dbProfile.approxLng,
          sports: sportFilter ? [sportFilter] : dbProfile.sports,
          skillLevel: (skillFilter || dbProfile.skillLevel) as SkillLevel,
          monthlyBudgetInr: maxPriceInr ?? dbProfile.monthlyBudgetInr,
          goals: dbProfile.goals,
          preferredDays: dbProfile.preferredDays,
          maxDistanceKm: maxDistanceKm ?? 50,
        }
      : {
          age: ageFilter ?? 16,
          city: coords.matchedCity,
          approxLat: coords.lat,
          approxLng: coords.lng,
          sports: sportFilter ? [sportFilter] : ['football', 'cricket', 'badminton', 'athletics', 'swimming'],
          skillLevel: (skillFilter || 'intermediate') as SkillLevel,
          monthlyBudgetInr: maxPriceInr ?? 5000,
          goals: ['fitness', 'school_team', 'scholarship'],
          preferredDays: ['Mon', 'Wed', 'Fri', 'Sat'],
          maxDistanceKm: maxDistanceKm ?? 50,
        };

    const allData = await getAllOpportunities();
    const scoredAll = scoreAllOpportunities(matchProfile, allData, false);

    let combined: Array<ScoredOpportunity<any>> = [];
    if (typeFilter === 'all' || typeFilter === 'coach') {
      combined.push(...scoredAll.coaches);
    }
    if (typeFilter === 'all' || typeFilter === 'facility') {
      combined.push(...scoredAll.facilities);
    }
    if (
      typeFilter === 'all' ||
      typeFilter === 'competition' ||
      typeFilter === 'trial'
    ) {
      const filteredCT = scoredAll.competitionsAndTrials.filter((x) =>
        typeFilter === 'all' ? true : x.itemType === typeFilter
      );
      combined.push(...filteredCT);
    }
    if (typeFilter === 'all' || typeFilter === 'scholarship') {
      combined.push(...scoredAll.scholarships);
    }

    combined = combined.filter((entry) => {
      const it = entry.item;
      if (sportFilter && it.sportSlug !== 'all' && it.sportSlug !== sportFilter) {
        return false;
      }
      if (
        cityFilter &&
        it.city.toLowerCase() !== 'pan-india' &&
        it.city.toLowerCase() !== cityFilter.toLowerCase()
      ) {
        return false;
      }
      const price =
        entry.itemType === 'scholarship'
          ? 0
          : it.monthlyFeeInr ?? it.entryFeeInr ?? 0;
      if (maxPriceInr !== null && price > maxPriceInr) {
        return false;
      }
      if (
        maxDistanceKm !== null &&
        it.city.toLowerCase() !== 'pan-india' &&
        entry.distanceKm > maxDistanceKm
      ) {
        return false;
      }
      if (ageFilter !== null && (ageFilter < it.minAge || ageFilter > it.maxAge)) {
        return false;
      }
      if (skillFilter && !it.skillLevels.includes(skillFilter)) {
        return false;
      }
      if (dateBefore && it.deadline && it.deadline > dateBefore) {
        return false;
      }
      if (q) {
        const haystack = [
          it.title,
          it.name,
          it.academyName,
          it.organizer,
          it.providerName,
          it.city,
          it.area,
          it.venue,
          it.sportSlug,
          it.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    combined.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ results: combined, total: combined.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Search failed';
    res.status(500).json({ error: message });
  }
});

// Opportunity detail endpoint
app.get('/api/opportunities/:type/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const type = req.params.type as OpportunityType;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }
    const item = await getOpportunityByTypeAndId(type, id);
    if (!item) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const dbProfile = req.dbUserId
      ? await getAthleteProfileByUserId(req.dbUserId)
      : null;
    const profile: AthleteMatchProfile = dbProfile
      ? {
          age: dbProfile.age,
          city: dbProfile.city,
          approxLat: dbProfile.approxLat,
          approxLng: dbProfile.approxLng,
          sports: dbProfile.sports,
          skillLevel: dbProfile.skillLevel as SkillLevel,
          monthlyBudgetInr: dbProfile.monthlyBudgetInr,
          goals: dbProfile.goals,
          preferredDays: dbProfile.preferredDays,
          maxDistanceKm: dbProfile.maxDistanceKm,
        }
      : buildDefaultProfile({});

    const raw = item as any;
    const scored = evaluateOpportunityMatch(
      profile,
      item,
      type,
      {
        sportSlug: raw.sportSlug,
        city: raw.city,
        lat: raw.lat,
        lng: raw.lng,
        priceInr:
          type === 'scholarship' ? 0 : raw.monthlyFeeInr ?? raw.entryFeeInr ?? 0,
        minAge: raw.minAge,
        maxAge: raw.maxAge,
        skillLevels: raw.skillLevels,
        goalTags: raw.goalTags,
        days: raw.trainingDays ?? raw.openDays ?? [],
        isPanIndia: Array.isArray(raw.eligibleCities)
          ? raw.eligibleCities.some((c: string) => c.toLowerCase() === 'pan-india')
          : false,
        isScholarship: type === 'scholarship',
      },
      { enforceHardFilters: false }
    );

    res.json({ item, itemType: type, match: scored });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load detail';
    res.status(500).json({ error: message });
  }
});

// Scholarship Eligibility Checker
app.post('/api/scholarships/check', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const body = req.body ?? {};
    const age = Number(body.age ?? 16);
    const sportsList =
      Array.isArray(body.sports) && body.sports.length > 0
        ? body.sports
        : ['football'];
    const achievementLevel = body.achievementLevel || 'school';
    const incomeBracket = body.incomeBracket || '2_5l_to_5l';
    const city = String(body.city || 'Bengaluru');

    const allData = await getAllOpportunities();
    const evaluations = allData.scholarships.map((sch) => ({
      scholarship: sch,
      evaluation: evaluateScholarshipEligibility(
        {
          age,
          sports: sportsList,
          achievementLevel,
          incomeBracket,
          city,
        },
        sch
      ),
    }));

    const rankOrder = { 'Likely eligible': 0, Maybe: 1, 'Not eligible': 2 };
    evaluations.sort(
      (a, b) =>
        rankOrder[a.evaluation.status] - rankOrder[b.evaluation.status] ||
        b.evaluation.score - a.evaluation.score
    );

    res.json({
      disclaimer:
        'Eligibility results are indicative based on published guidelines and self-reported profile details. Final selection is determined solely by the scholarship provider.',
      evaluations,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to evaluate scholarship eligibility';
    res.status(500).json({ error: message });
  }
});

// AI Assistant Chat (parses natural-language query into structured filters using Gemini, runs deterministic search)
app.post('/api/ai/chat', optionalAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeededOnRequest();
    const { message } = req.body ?? {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const dbProfile = req.dbUserId
      ? await getAthleteProfileByUserId(req.dbUserId)
      : null;

    const parsed = await parseNaturalLanguageQuery(message, dbProfile ?? undefined);

    const targetCity = parsed.city || dbProfile?.city || 'Bengaluru';
    const coords = resolveApproxCoordinates(targetCity, dbProfile?.pinCode);
    const searchProfile: AthleteMatchProfile = {
      age: dbProfile?.age ?? 16,
      city: coords.matchedCity,
      approxLat: parsed.city ? coords.lat : dbProfile?.approxLat ?? coords.lat,
      approxLng: parsed.city ? coords.lng : dbProfile?.approxLng ?? coords.lng,
      sports: parsed.sportSlug
        ? [parsed.sportSlug]
        : dbProfile?.sports ?? ['football', 'cricket', 'badminton', 'athletics', 'swimming'],
      skillLevel: (parsed.skillLevel || dbProfile?.skillLevel || 'intermediate') as SkillLevel,
      monthlyBudgetInr: parsed.maxBudgetInr ?? dbProfile?.monthlyBudgetInr ?? 5000,
      goals: dbProfile?.goals ?? ['fitness', 'school_team', 'scholarship'],
      preferredDays: dbProfile?.preferredDays ?? ['Mon', 'Wed', 'Fri', 'Sat'],
      maxDistanceKm: parsed.maxDistanceKm ?? dbProfile?.maxDistanceKm ?? 25,
    };

    const allData = await getAllOpportunities();
    const scored = scoreAllOpportunities(searchProfile, allData, false);

    let candidates: Array<ScoredOpportunity<any>> = [];
    if (parsed.itemType === 'coach') candidates = scored.coaches;
    else if (parsed.itemType === 'facility') candidates = scored.facilities;
    else if (parsed.itemType === 'competition' || parsed.itemType === 'trial') {
      candidates = scored.competitionsAndTrials.filter(
        (c) => c.itemType === parsed.itemType
      );
    } else if (parsed.itemType === 'scholarship') {
      candidates = scored.scholarships;
    } else {
      candidates = [
        ...scored.coaches,
        ...scored.facilities,
        ...scored.competitionsAndTrials,
        ...scored.scholarships,
      ];
    }

    const filtered = candidates
      .filter((entry) => {
        const it = entry.item;
        if (
          parsed.sportSlug &&
          it.sportSlug !== 'all' &&
          it.sportSlug !== parsed.sportSlug
        ) {
          return false;
        }
        if (
          parsed.city &&
          it.city.toLowerCase() !== 'pan-india' &&
          it.city.toLowerCase() !== parsed.city.toLowerCase()
        ) {
          return false;
        }
        const price =
          entry.itemType === 'scholarship'
            ? 0
            : it.monthlyFeeInr ?? it.entryFeeInr ?? 0;
        if (parsed.maxBudgetInr !== null && price > parsed.maxBudgetInr) {
          return false;
        }
        if (
          parsed.maxDistanceKm !== null &&
          it.city.toLowerCase() !== 'pan-india' &&
          entry.distanceKm > parsed.maxDistanceKm
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);

    const matchedTitles = filtered.map(
      (f) => `${f.item.title || f.item.name} (${f.item.city}, ${f.matchScore}% match)`
    );
    const athleteSummary = `Age ${searchProfile.age}, City ${searchProfile.city}, Sports [${searchProfile.sports.join(', ')}], Budget ₹${searchProfile.monthlyBudgetInr}`;
    const reply = await generateChatSummary(message, athleteSummary, matchedTitles);

    res.json({
      reply,
      parsedFilters: parsed,
      results: filtered,
    });
  } catch (error: unknown) {
    console.error('AI Chat error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'AI assistant is currently unavailable. Please check GEMINI_API_KEY configuration.';
    res.status(500).json({ error: message });
  }
});

// Saved items
app.get('/api/saved', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await getSavedItemsByUser(req.dbUserId!);
    const enriched = await Promise.all(
      items.map(async (s) => ({
        ...s,
        detail: await getOpportunityByTypeAndId(s.itemType as OpportunityType, s.itemId),
      }))
    );
    res.json(enriched.filter((e) => e.detail !== null));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load saved items';
    res.status(500).json({ error: message });
  }
});

app.post('/api/saved', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { itemType, itemId } = req.body ?? {};
    if (!itemType || !itemId) {
      return res.status(400).json({ error: 'itemType and itemId are required' });
    }
    const created = await addSavedItem(req.dbUserId!, String(itemType), Number(itemId));
    res.status(201).json(created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save item';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/saved/:type/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await removeSavedItem(
      req.dbUserId!,
      String(req.params.type),
      Number(req.params.id)
    );
    res.json({ removed: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove saved item';
    res.status(500).json({ error: message });
  }
});

// Applications & Deadlines Tracker
app.get('/api/applications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const items = await getApplicationsByUser(req.dbUserId!);
    res.json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load deadlines';
    res.status(500).json({ error: message });
  }
});

app.post('/api/applications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { itemType, itemId, title, deadline, status, notes } = req.body ?? {};
    if (!itemType || !itemId || !title || !deadline) {
      return res
        .status(400)
        .json({ error: 'itemType, itemId, title, and deadline are required' });
    }
    const created = await addApplication(req.dbUserId!, {
      itemType: String(itemType),
      itemId: Number(itemId),
      title: String(title),
      deadline: String(deadline),
      status: status ? String(status) : 'planned',
      notes: notes ? String(notes) : undefined,
    });
    res.status(201).json(created);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to track deadline';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body ?? {};
    const updated = await updateApplicationStatus(
      req.dbUserId!,
      Number(req.params.id),
      { status, notes }
    );
    if (!updated) return res.status(404).json({ error: 'Deadline entry not found' });
    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update deadline';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/applications/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    await deleteApplication(req.dbUserId!, Number(req.params.id));
    res.json({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete deadline';
    res.status(500).json({ error: message });
  }
});

// Report listing safety workflow
app.post('/api/reports', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { itemType, itemId, reason, details } = req.body ?? {};
    if (!itemType || !itemId || !reason) {
      return res
        .status(400)
        .json({ error: 'itemType, itemId, and reason are required' });
    }
    const report = await createListingReport({
      userId: req.dbUserId ?? null,
      itemType: String(itemType),
      itemId: Number(itemId),
      reason: String(reason),
      details: details ? String(details) : undefined,
    });
    res.status(201).json({ report, message: 'Thank you. Our safety team will review this listing.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit report';
    res.status(500).json({ error: message });
  }
});

// Provider Dashboard CRUD
app.get('/api/provider/listings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const listings = await getProviderListings(req.dbUserId!);
    res.json(listings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load provider listings';
    res.status(500).json({ error: message });
  }
});

app.post('/api/provider/listings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body ?? {};
    const listingType = body.listingType as OpportunityType;
    const city = String(body.city || 'Bengaluru');
    const coords = resolveApproxCoordinates(city, body.pinCode);
    const sportSlug = String(body.sportSlug || 'football');
    const defaultImage = SPORT_IMAGES[sportSlug] || SPORT_IMAGES.football;

    if (listingType === 'coach') {
      const rows = await db
        .insert(coaches)
        .values({
          providerUserId: req.dbUserId!,
          sportSlug,
          name: String(body.name || 'Coach Listing'),
          academyName: String(body.academyName || 'Community Sports Academy'),
          city: coords.matchedCity,
          area: String(body.area || 'Central'),
          pinCode: String(body.pinCode || '560001'),
          lat: coords.lat,
          lng: coords.lng,
          monthlyFeeInr: Number(body.priceInr ?? 1500),
          minAge: Number(body.minAge ?? 10),
          maxAge: Number(body.maxAge ?? 21),
          skillLevels: body.skillLevels || ['beginner', 'intermediate'],
          goalTags: body.goalTags || ['fitness', 'school_team'],
          trainingDays: body.days || ['Mon', 'Wed', 'Fri'],
          experienceYears: Number(body.experienceYears ?? 5),
          certification: String(body.certification || 'NIS Certified Coach'),
          description: String(body.description || ''),
          contactUrl: String(body.contactUrl || 'https://sportbridge.example.org/apply'),
          imageUrl: defaultImage,
          verified: false,
        })
        .returning();
      return res.status(201).json(rows[0]);
    }

    if (listingType === 'facility') {
      const rows = await db
        .insert(facilities)
        .values({
          providerUserId: req.dbUserId!,
          sportSlug,
          name: String(body.name || 'Sports Facility'),
          facilityType: String(body.facilityType || 'Training Complex'),
          city: coords.matchedCity,
          area: String(body.area || 'Central'),
          pinCode: String(body.pinCode || '560001'),
          lat: coords.lat,
          lng: coords.lng,
          monthlyFeeInr: Number(body.priceInr ?? 1000),
          minAge: Number(body.minAge ?? 10),
          maxAge: Number(body.maxAge ?? 25),
          skillLevels: body.skillLevels || ['beginner', 'intermediate', 'advanced'],
          goalTags: body.goalTags || ['fitness', 'school_team'],
          openDays: body.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          amenities: body.amenities || ['Floodlights', 'Changing rooms'],
          description: String(body.description || ''),
          contactUrl: String(body.contactUrl || 'https://sportbridge.example.org/book'),
          imageUrl: defaultImage,
          verified: false,
        })
        .returning();
      return res.status(201).json(rows[0]);
    }

    if (listingType === 'competition') {
      const rows = await db
        .insert(competitions)
        .values({
          providerUserId: req.dbUserId!,
          sportSlug,
          title: String(body.title || 'Youth Championship'),
          organizer: String(body.organizer || 'District Sports Association'),
          level: String(body.level || 'district'),
          city: coords.matchedCity,
          venue: String(body.venue || 'Municipal Stadium'),
          lat: coords.lat,
          lng: coords.lng,
          entryFeeInr: Number(body.priceInr ?? 400),
          minAge: Number(body.minAge ?? 12),
          maxAge: Number(body.maxAge ?? 19),
          skillLevels: body.skillLevels || ['intermediate', 'advanced'],
          goalTags: body.goalTags || ['school_team', 'state_national'],
          eventDate: String(body.eventDate || '2026-12-28'),
          deadline: String(body.deadline || '2026-12-18'),
          description: String(body.description || ''),
          eligibilityNotes: String(body.eligibilityNotes || 'Age proof required.'),
          applyUrl: String(body.applyUrl || 'https://sportbridge.example.org/register'),
          verified: false,
        })
        .returning();
      return res.status(201).json(rows[0]);
    }

    if (listingType === 'trial') {
      const rows = await db
        .insert(trials)
        .values({
          providerUserId: req.dbUserId!,
          sportSlug,
          title: String(body.title || 'Academy Selection Trial'),
          organizer: String(body.organizer || 'Youth Academy'),
          city: coords.matchedCity,
          venue: String(body.venue || 'Academy Ground'),
          lat: coords.lat,
          lng: coords.lng,
          entryFeeInr: Number(body.priceInr ?? 0),
          minAge: Number(body.minAge ?? 12),
          maxAge: Number(body.maxAge ?? 18),
          skillLevels: body.skillLevels || ['intermediate', 'advanced'],
          goalTags: body.goalTags || ['state_national', 'scholarship'],
          trialDate: String(body.eventDate || '2026-12-22'),
          deadline: String(body.deadline || '2026-12-15'),
          description: String(body.description || ''),
          eligibilityNotes: String(body.eligibilityNotes || 'Guardian consent for U-18.'),
          applyUrl: String(body.applyUrl || 'https://sportbridge.example.org/trial'),
          verified: false,
        })
        .returning();
      return res.status(201).json(rows[0]);
    }

    if (listingType === 'scholarship') {
      const rows = await db
        .insert(scholarships)
        .values({
          providerUserId: req.dbUserId!,
          sportSlug,
          title: String(body.title || 'Youth Athlete Support Grant'),
          providerName: String(body.organizer || 'Sports Welfare Foundation'),
          city: body.panIndia ? 'Pan-India' : coords.matchedCity,
          lat: coords.lat,
          lng: coords.lng,
          awardAmountInr: Number(body.awardAmountInr ?? 50000),
          minAge: Number(body.minAge ?? 11),
          maxAge: Number(body.maxAge ?? 20),
          minAchievementLevel: String(body.minAchievementLevel || 'school'),
          maxIncomeBracket: String(body.maxIncomeBracket || '5l_to_10l'),
          eligibleCities: body.panIndia ? ['Pan-India'] : [coords.matchedCity],
          skillLevels: body.skillLevels || ['beginner', 'intermediate', 'advanced'],
          goalTags: body.goalTags || ['scholarship'],
          deadline: String(body.deadline || '2027-01-10'),
          description: String(body.description || ''),
          eligibilityChecklist: body.eligibilityChecklist || [
            'Valid age proof',
            'Guardian consent if under 18',
          ],
          applyUrl: String(body.applyUrl || 'https://sportbridge.example.org/scholarship'),
          verified: false,
        })
        .returning();
      return res.status(201).json(rows[0]);
    }

    return res.status(400).json({ error: 'Invalid listingType' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create listing';
    res.status(500).json({ error: message });
  }
});

app.put('/api/provider/listings/:type/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const type = req.params.type as OpportunityType;
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const city = String(body.city || 'Bengaluru');
    const coords = resolveApproxCoordinates(city, body.pinCode);

    if (type === 'coach') {
      const rows = await db
        .update(coaches)
        .set({
          name: body.name,
          academyName: body.academyName,
          city: coords.matchedCity,
          area: body.area,
          monthlyFeeInr: Number(body.priceInr),
          minAge: Number(body.minAge),
          maxAge: Number(body.maxAge),
          description: body.description,
          contactUrl: body.contactUrl,
        })
        .where(and(eq(coaches.id, id), eq(coaches.providerUserId, req.dbUserId!)))
        .returning();
      if (!rows[0]) return res.status(404).json({ error: 'Listing not found or unauthorized' });
      return res.json(rows[0]);
    }

    if (type === 'facility') {
      const rows = await db
        .update(facilities)
        .set({
          name: body.name,
          facilityType: body.facilityType,
          city: coords.matchedCity,
          area: body.area,
          monthlyFeeInr: Number(body.priceInr),
          minAge: Number(body.minAge),
          maxAge: Number(body.maxAge),
          description: body.description,
          contactUrl: body.contactUrl,
        })
        .where(and(eq(facilities.id, id), eq(facilities.providerUserId, req.dbUserId!)))
        .returning();
      if (!rows[0]) return res.status(404).json({ error: 'Listing not found or unauthorized' });
      return res.json(rows[0]);
    }

    if (type === 'competition') {
      const rows = await db
        .update(competitions)
        .set({
          title: body.title,
          organizer: body.organizer,
          city: coords.matchedCity,
          venue: body.venue,
          entryFeeInr: Number(body.priceInr),
          deadline: body.deadline,
          description: body.description,
          applyUrl: body.applyUrl,
        })
        .where(and(eq(competitions.id, id), eq(competitions.providerUserId, req.dbUserId!)))
        .returning();
      if (!rows[0]) return res.status(404).json({ error: 'Listing not found or unauthorized' });
      return res.json(rows[0]);
    }

    if (type === 'trial') {
      const rows = await db
        .update(trials)
        .set({
          title: body.title,
          organizer: body.organizer,
          city: coords.matchedCity,
          venue: body.venue,
          entryFeeInr: Number(body.priceInr),
          deadline: body.deadline,
          description: body.description,
          applyUrl: body.applyUrl,
        })
        .where(and(eq(trials.id, id), eq(trials.providerUserId, req.dbUserId!)))
        .returning();
      if (!rows[0]) return res.status(404).json({ error: 'Listing not found or unauthorized' });
      return res.json(rows[0]);
    }

    if (type === 'scholarship') {
      const rows = await db
        .update(scholarships)
        .set({
          title: body.title,
          providerName: body.organizer,
          awardAmountInr: Number(body.awardAmountInr),
          deadline: body.deadline,
          description: body.description,
          applyUrl: body.applyUrl,
        })
        .where(and(eq(scholarships.id, id), eq(scholarships.providerUserId, req.dbUserId!)))
        .returning();
      if (!rows[0]) return res.status(404).json({ error: 'Listing not found or unauthorized' });
      return res.json(rows[0]);
    }

    return res.status(400).json({ error: 'Invalid listing type' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update listing';
    res.status(500).json({ error: message });
  }
});

// Explicit seed endpoint
app.post('/api/seed', async (_req, res) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SportBridge AI server running on http://0.0.0.0:${port}`);
  });
}

startServer();
