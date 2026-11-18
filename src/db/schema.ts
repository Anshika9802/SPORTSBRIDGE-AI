import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Users linked to Firebase Auth UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('athlete'), // 'athlete' | 'provider'
  preferredCurrency: text('preferred_currency').notNull().default('INR'), // 'INR' | 'USD'
  createdAt: timestamp('created_at').defaultNow(),
});

// Athlete profiles (minors require guardian consent; exact street addresses are never stored or shared)
export const athleteProfiles = pgTable(
  'athlete_profiles',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    fullName: text('full_name').notNull(),
    age: integer('age').notNull(),
    city: text('city').notNull(),
    pinCode: text('pin_code').notNull(),
    approxLat: doublePrecision('approx_lat').notNull(),
    approxLng: doublePrecision('approx_lng').notNull(),
    sports: jsonb('sports').$type<string[]>().notNull(),
    skillLevel: text('skill_level').notNull(), // 'beginner' | 'intermediate' | 'advanced' | 'elite'
    monthlyBudgetInr: integer('monthly_budget_inr').notNull(),
    goals: jsonb('goals').$type<string[]>().notNull(),
    preferredDays: jsonb('preferred_days').$type<string[]>().notNull(),
    maxDistanceKm: integer('max_distance_km').notNull().default(15),
    incomeBracket: text('income_bracket').notNull().default('2_5l_to_5l'),
    achievementLevel: text('achievement_level').notNull().default('school'),
    isMinor: boolean('is_minor').notNull().default(false),
    guardianConsent: boolean('guardian_consent').notNull().default(false),
    guardianName: text('guardian_name'),
    guardianRelation: text('guardian_relation'),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [index('athlete_profiles_city_idx').on(table.city)]
);

// Sports taxonomy
export const sports = pgTable('sports', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
});

// Coaches & Academies
export const coaches = pgTable(
  'coaches',
  {
    id: serial('id').primaryKey(),
    providerUserId: integer('provider_user_id').references(() => users.id, { onDelete: 'set null' }),
    sportSlug: text('sport_slug').notNull(),
    name: text('name').notNull(),
    academyName: text('academy_name').notNull(),
    city: text('city').notNull(),
    area: text('area').notNull(),
    pinCode: text('pin_code').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    monthlyFeeInr: integer('monthly_fee_inr').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    skillLevels: jsonb('skill_levels').$type<string[]>().notNull(),
    goalTags: jsonb('goal_tags').$type<string[]>().notNull(),
    trainingDays: jsonb('training_days').$type<string[]>().notNull(),
    experienceYears: integer('experience_years').notNull(),
    certification: text('certification').notNull(),
    description: text('description').notNull(),
    contactUrl: text('contact_url').notNull(),
    imageUrl: text('image_url').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('coaches_sport_idx').on(table.sportSlug),
    index('coaches_city_idx').on(table.city),
  ]
);

// Training Facilities
export const facilities = pgTable(
  'facilities',
  {
    id: serial('id').primaryKey(),
    providerUserId: integer('provider_user_id').references(() => users.id, { onDelete: 'set null' }),
    sportSlug: text('sport_slug').notNull(),
    name: text('name').notNull(),
    facilityType: text('facility_type').notNull(),
    city: text('city').notNull(),
    area: text('area').notNull(),
    pinCode: text('pin_code').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    monthlyFeeInr: integer('monthly_fee_inr').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    skillLevels: jsonb('skill_levels').$type<string[]>().notNull(),
    goalTags: jsonb('goal_tags').$type<string[]>().notNull(),
    openDays: jsonb('open_days').$type<string[]>().notNull(),
    amenities: jsonb('amenities').$type<string[]>().notNull(),
    description: text('description').notNull(),
    contactUrl: text('contact_url').notNull(),
    imageUrl: text('image_url').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('facilities_sport_idx').on(table.sportSlug),
    index('facilities_city_idx').on(table.city),
  ]
);

// Upcoming Competitions
export const competitions = pgTable(
  'competitions',
  {
    id: serial('id').primaryKey(),
    providerUserId: integer('provider_user_id').references(() => users.id, { onDelete: 'set null' }),
    sportSlug: text('sport_slug').notNull(),
    title: text('title').notNull(),
    organizer: text('organizer').notNull(),
    level: text('level').notNull(), // 'school' | 'district' | 'state' | 'national'
    city: text('city').notNull(),
    venue: text('venue').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    entryFeeInr: integer('entry_fee_inr').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    skillLevels: jsonb('skill_levels').$type<string[]>().notNull(),
    goalTags: jsonb('goal_tags').$type<string[]>().notNull(),
    eventDate: text('event_date').notNull(),
    deadline: text('deadline').notNull(),
    description: text('description').notNull(),
    eligibilityNotes: text('eligibility_notes').notNull(),
    applyUrl: text('apply_url').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('competitions_sport_idx').on(table.sportSlug),
    index('competitions_city_idx').on(table.city),
  ]
);

// Selection Trials
export const trials = pgTable(
  'trials',
  {
    id: serial('id').primaryKey(),
    providerUserId: integer('provider_user_id').references(() => users.id, { onDelete: 'set null' }),
    sportSlug: text('sport_slug').notNull(),
    title: text('title').notNull(),
    organizer: text('organizer').notNull(),
    city: text('city').notNull(),
    venue: text('venue').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    entryFeeInr: integer('entry_fee_inr').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    skillLevels: jsonb('skill_levels').$type<string[]>().notNull(),
    goalTags: jsonb('goal_tags').$type<string[]>().notNull(),
    trialDate: text('trial_date').notNull(),
    deadline: text('deadline').notNull(),
    description: text('description').notNull(),
    eligibilityNotes: text('eligibility_notes').notNull(),
    applyUrl: text('apply_url').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('trials_sport_idx').on(table.sportSlug),
    index('trials_city_idx').on(table.city),
  ]
);

// Sports Scholarships & Grants
export const scholarships = pgTable(
  'scholarships',
  {
    id: serial('id').primaryKey(),
    providerUserId: integer('provider_user_id').references(() => users.id, { onDelete: 'set null' }),
    sportSlug: text('sport_slug').notNull(), // 'all' or specific sport slug
    title: text('title').notNull(),
    providerName: text('provider_name').notNull(),
    city: text('city').notNull(), // 'Pan-India' or specific city
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    awardAmountInr: integer('award_amount_inr').notNull(),
    minAge: integer('min_age').notNull(),
    maxAge: integer('max_age').notNull(),
    minAchievementLevel: text('min_achievement_level').notNull(), // 'beginner' | 'school' | 'district' | 'state' | 'national'
    maxIncomeBracket: text('max_income_bracket').notNull(), // 'under_2_5l' | '2_5l_to_5l' | '5l_to_10l' | 'above_10l'
    eligibleCities: jsonb('eligible_cities').$type<string[]>().notNull(),
    skillLevels: jsonb('skill_levels').$type<string[]>().notNull(),
    goalTags: jsonb('goal_tags').$type<string[]>().notNull(),
    deadline: text('deadline').notNull(),
    description: text('description').notNull(),
    eligibilityChecklist: jsonb('eligibility_checklist').$type<string[]>().notNull(),
    applyUrl: text('apply_url').notNull(),
    verified: boolean('verified').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [index('scholarships_sport_idx').on(table.sportSlug)]
);

// Saved Opportunities
export const savedItems = pgTable(
  'saved_items',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    itemType: text('item_type').notNull(), // 'coach' | 'facility' | 'competition' | 'trial' | 'scholarship'
    itemId: integer('item_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('saved_items_user_idx').on(table.userId),
    index('saved_items_lookup_idx').on(table.itemType, table.itemId),
  ]
);

// Application & Deadline Tracker
export const applications = pgTable(
  'applications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    itemType: text('item_type').notNull(),
    itemId: integer('item_id').notNull(),
    title: text('title').notNull(),
    deadline: text('deadline').notNull(),
    status: text('status').notNull().default('planned'), // 'planned' | 'applied' | 'shortlisted' | 'completed'
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [index('applications_user_idx').on(table.userId)]
);

// Fraud & Safety Reports
export const listingReports = pgTable('listing_reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  itemType: text('item_type').notNull(),
  itemId: integer('item_id').notNull(),
  reason: text('reason').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Drizzle Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  athleteProfile: one(athleteProfiles, {
    fields: [users.id],
    references: [athleteProfiles.userId],
  }),
  savedItems: many(savedItems),
  applications: many(applications),
}));

export const athleteProfilesRelations = relations(athleteProfiles, ({ one }) => ({
  user: one(users, {
    fields: [athleteProfiles.userId],
    references: [users.id],
  }),
}));

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  user: one(users, {
    fields: [savedItems.userId],
    references: [users.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
}));
