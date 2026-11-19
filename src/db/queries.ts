import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  applications,
  athleteProfiles,
  coaches,
  competitions,
  facilities,
  listingReports,
  savedItems,
  scholarships,
  sports,
  trials,
  users,
} from './schema.ts';
import type { OpportunityType } from '../lib/matching.ts';

export async function getUserById(userId: number) {
  try {
    const rows = await db.select().from(users).where(eq(users.id, userId));
    return rows[0] ?? null;
  } catch (error) {
    console.error('getUserById failed:', error);
    throw new Error('Failed to load user account.', { cause: error });
  }
}

export async function updateUserSettings(
  userId: number,
  data: { role?: string; preferredCurrency?: string }
) {
  try {
    const rows = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('updateUserSettings failed:', error);
    throw new Error('Failed to update account settings.', { cause: error });
  }
}

export async function getAthleteProfileByUserId(userId: number) {
  try {
    const rows = await db
      .select()
      .from(athleteProfiles)
      .where(eq(athleteProfiles.userId, userId));
    return rows[0] ?? null;
  } catch (error) {
    console.error('getAthleteProfileByUserId failed:', error);
    throw new Error('Failed to load athlete profile.', { cause: error });
  }
}

export async function upsertAthleteProfile(
  userId: number,
  profile: {
    fullName: string;
    age: number;
    city: string;
    pinCode: string;
    approxLat: number;
    approxLng: number;
    sports: string[];
    skillLevel: string;
    monthlyBudgetInr: number;
    goals: string[];
    preferredDays: string[];
    maxDistanceKm: number;
    incomeBracket: string;
    achievementLevel: string;
    isMinor: boolean;
    guardianConsent: boolean;
    guardianName?: string | null;
    guardianRelation?: string | null;
  }
) {
  try {
    const rows = await db
      .insert(athleteProfiles)
      .values({
        userId,
        ...profile,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: athleteProfiles.userId,
        set: {
          ...profile,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('upsertAthleteProfile failed:', error);
    throw new Error('Failed to save athlete profile.', { cause: error });
  }
}

export async function getAllSports() {
  try {
    return await db.select().from(sports);
  } catch (error) {
    console.error('getAllSports failed:', error);
    throw new Error('Failed to load sports catalog.', { cause: error });
  }
}

export async function getAllOpportunities() {
  try {
    const [coachRows, facilityRows, competitionRows, trialRows, scholarshipRows] =
      await Promise.all([
        db.select().from(coaches).orderBy(desc(coaches.createdAt)),
        db.select().from(facilities).orderBy(desc(facilities.createdAt)),
        db.select().from(competitions).orderBy(desc(competitions.createdAt)),
        db.select().from(trials).orderBy(desc(trials.createdAt)),
        db.select().from(scholarships).orderBy(desc(scholarships.createdAt)),
      ]);
    return {
      coaches: coachRows,
      facilities: facilityRows,
      competitions: competitionRows,
      trials: trialRows,
      scholarships: scholarshipRows,
    };
  } catch (error) {
    console.error('getAllOpportunities failed:', error);
    throw new Error('Failed to load sports opportunities.', { cause: error });
  }
}

export async function getOpportunityByTypeAndId(type: OpportunityType, id: number) {
  try {
    if (type === 'coach') {
      const rows = await db.select().from(coaches).where(eq(coaches.id, id));
      return rows[0] ?? null;
    }
    if (type === 'facility') {
      const rows = await db.select().from(facilities).where(eq(facilities.id, id));
      return rows[0] ?? null;
    }
    if (type === 'competition') {
      const rows = await db.select().from(competitions).where(eq(competitions.id, id));
      return rows[0] ?? null;
    }
    if (type === 'trial') {
      const rows = await db.select().from(trials).where(eq(trials.id, id));
      return rows[0] ?? null;
    }
    if (type === 'scholarship') {
      const rows = await db.select().from(scholarships).where(eq(scholarships.id, id));
      return rows[0] ?? null;
    }
    return null;
  } catch (error) {
    console.error('getOpportunityByTypeAndId failed:', error);
    throw new Error('Failed to load opportunity details.', { cause: error });
  }
}

export async function getSavedItemsByUser(userId: number) {
  try {
    return await db
      .select()
      .from(savedItems)
      .where(eq(savedItems.userId, userId))
      .orderBy(desc(savedItems.createdAt));
  } catch (error) {
    console.error('getSavedItemsByUser failed:', error);
    throw new Error('Failed to load saved opportunities.', { cause: error });
  }
}

export async function addSavedItem(userId: number, itemType: string, itemId: number) {
  try {
    const existing = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.userId, userId),
          eq(savedItems.itemType, itemType),
          eq(savedItems.itemId, itemId)
        )
      );
    if (existing.length > 0) return existing[0];
    const rows = await db
      .insert(savedItems)
      .values({ userId, itemType, itemId })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('addSavedItem failed:', error);
    throw new Error('Failed to save opportunity.', { cause: error });
  }
}

export async function removeSavedItem(userId: number, itemType: string, itemId: number) {
  try {
    await db
      .delete(savedItems)
      .where(
        and(
          eq(savedItems.userId, userId),
          eq(savedItems.itemType, itemType),
          eq(savedItems.itemId, itemId)
        )
      );
    return true;
  } catch (error) {
    console.error('removeSavedItem failed:', error);
    throw new Error('Failed to remove saved opportunity.', { cause: error });
  }
}

export async function getApplicationsByUser(userId: number) {
  try {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(applications.deadline);
  } catch (error) {
    console.error('getApplicationsByUser failed:', error);
    throw new Error('Failed to load deadline tracker.', { cause: error });
  }
}

export async function addApplication(
  userId: number,
  data: {
    itemType: string;
    itemId: number;
    title: string;
    deadline: string;
    status?: string;
    notes?: string;
  }
) {
  try {
    const rows = await db
      .insert(applications)
      .values({
        userId,
        itemType: data.itemType,
        itemId: data.itemId,
        title: data.title,
        deadline: data.deadline,
        status: data.status || 'planned',
        notes: data.notes || null,
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('addApplication failed:', error);
    throw new Error('Failed to add deadline.', { cause: error });
  }
}

export async function updateApplicationStatus(
  userId: number,
  id: number,
  data: { status?: string; notes?: string }
) {
  try {
    const rows = await db
      .update(applications)
      .set(data)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('updateApplicationStatus failed:', error);
    throw new Error('Failed to update application status.', { cause: error });
  }
}

export async function deleteApplication(userId: number, id: number) {
  try {
    await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, userId)));
    return true;
  } catch (error) {
    console.error('deleteApplication failed:', error);
    throw new Error('Failed to delete application.', { cause: error });
  }
}

export async function createListingReport(data: {
  userId: number | null;
  itemType: string;
  itemId: number;
  reason: string;
  details?: string;
}) {
  try {
    const rows = await db.insert(listingReports).values(data).returning();
    return rows[0];
  } catch (error) {
    console.error('createListingReport failed:', error);
    throw new Error('Failed to submit listing report.', { cause: error });
  }
}

export async function getProviderListings(userId: number) {
  try {
    const [coachRows, facilityRows, competitionRows, trialRows, scholarshipRows] =
      await Promise.all([
        db.select().from(coaches).where(eq(coaches.providerUserId, userId)),
        db.select().from(facilities).where(eq(facilities.providerUserId, userId)),
        db.select().from(competitions).where(eq(competitions.providerUserId, userId)),
        db.select().from(trials).where(eq(trials.providerUserId, userId)),
        db.select().from(scholarships).where(eq(scholarships.providerUserId, userId)),
      ]);
    return {
      coaches: coachRows,
      facilities: facilityRows,
      competitions: competitionRows,
      trials: trialRows,
      scholarships: scholarshipRows,
    };
  } catch (error) {
    console.error('getProviderListings failed:', error);
    throw new Error('Failed to load provider listings.', { cause: error });
  }
}
