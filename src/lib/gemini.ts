import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface ParsedChatFilters {
  intent: 'search' | 'scholarship' | 'advice';
  itemType: 'all' | 'coach' | 'facility' | 'competition' | 'trial' | 'scholarship';
  sportSlug: string | null;
  city: string | null;
  maxBudgetInr: number | null;
  maxDistanceKm: number | null;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
  keywords: string[];
}

/**
 * Uses Gemini 4 Hydrogen with structured JSON schema to parse natural-language
 * athlete queries into deterministic search filters.
 */
export async function parseNaturalLanguageQuery(
  query: string,
  athleteContext?: {
    city?: string;
    sports?: string[];
    skillLevel?: string;
    monthlyBudgetInr?: number;
    age?: number;
  }
): Promise<ParsedChatFilters> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }

  const contextHint = athleteContext
    ? `Athlete context: age=${athleteContext.age ?? 'unknown'}, city=${athleteContext.city ?? 'unknown'}, sports=${(athleteContext.sports ?? []).join(',')}, skill=${athleteContext.skillLevel ?? 'unknown'}, budget=${athleteContext.monthlyBudgetInr ?? 'unknown'} INR.`
    : 'No athlete profile context provided.';

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `${contextHint}\n\nUser query: "${query}"`,
    config: {
      systemInstruction:
        'You are a sports opportunity search parser for India. Extract structured filters from the user query. Available sportSlug values: cricket, football, badminton, athletics, swimming. Available cities: Bengaluru, Mumbai, Delhi NCR, Pune, Hyderabad, Chennai. If user says "near me", use the athlete context city. Return null for unspecified numeric or string filters.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: {
            type: Type.STRING,
            description: 'One of: search, scholarship, advice',
          },
          itemType: {
            type: Type.STRING,
            description: 'One of: all, coach, facility, competition, trial, scholarship',
          },
          sportSlug: {
            type: Type.STRING,
            nullable: true,
            description: 'One of cricket, football, badminton, athletics, swimming, or null',
          },
          city: {
            type: Type.STRING,
            nullable: true,
            description: 'City name if mentioned or "near me" resolved from context, else null',
          },
          maxBudgetInr: {
            type: Type.INTEGER,
            nullable: true,
            description: 'Maximum monthly fee or entry fee in INR if mentioned, else null',
          },
          maxDistanceKm: {
            type: Type.INTEGER,
            nullable: true,
            description: 'Maximum distance in km if mentioned, else null',
          },
          skillLevel: {
            type: Type.STRING,
            nullable: true,
            description: 'One of beginner, intermediate, advanced, elite, or null',
          },
          keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 3 concise search keywords',
          },
        },
        required: ['intent', 'itemType', 'keywords'],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText);

  return {
    intent: parsed.intent || 'search',
    itemType: parsed.itemType || 'all',
    sportSlug: parsed.sportSlug ?? null,
    city: parsed.city ?? null,
    maxBudgetInr: typeof parsed.maxBudgetInr === 'number' ? parsed.maxBudgetInr : null,
    maxDistanceKm: typeof parsed.maxDistanceKm === 'number' ? parsed.maxDistanceKm : null,
    skillLevel: parsed.skillLevel ?? null,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  };
}

/**
 * Generates concise, grounded "Why this matches you" explanations in batch
 * for top-ranked deterministic matches.
 */
export async function generateMatchExplanations(
  athleteSummary: string,
  items: Array<{ idKey: string; title: string; sport: string; city: string; priceInr: number; matchScore: number; deterministicReason: string }>
): Promise<Record<string, string>> {
  if (items.length === 0) return {};
  const ai = getGeminiClient();
  if (!ai) {
    return {};
  }

  const prompt = `Athlete profile: ${athleteSummary}\n\nOpportunities:\n${items
    .map(
      (it) =>
        `- idKey="${it.idKey}" | title="${it.title}" | sport=${it.sport} | city=${it.city} | feeINR=${it.priceInr} | matchScore=${it.matchScore}% | facts="${it.deterministicReason}"`
    )
    .join('\n')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'Write a crisp 1-sentence "Why this matches you" explanation (max 22 words) for each opportunity based strictly on the provided facts and athlete profile. Do not invent facts or guarantee admission/eligibility.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            idKey: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['idKey', 'explanation'],
        },
      },
    },
  });

  const arr = JSON.parse((response.text ?? '[]').trim()) as Array<{
    idKey: string;
    explanation: string;
  }>;
  const map: Record<string, string> = {};
  for (const entry of arr) {
    if (entry.idKey && entry.explanation) {
      map[entry.idKey] = entry.explanation;
    }
  }
  return map;
}

/**
 * Summarizes structured search results in natural language for the AI Assistant Chat.
 */
export async function generateChatSummary(
  userQuery: string,
  athleteSummary: string,
  matchedTitles: string[]
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Athlete: ${athleteSummary}\nQuery: "${userQuery}"\nTop matched opportunities: ${
      matchedTitles.length > 0 ? matchedTitles.join('; ') : 'None found within exact filters'
    }`,
    config: {
      systemInstruction:
        'You are SportBridge AI Coach Assistant. Reply in 2-3 clear, encouraging sentences summarizing the matched opportunities or advising how to broaden filters if none matched. Remind users that scholarship/trial eligibility is indicative only.',
    },
  });

  return (response.text ?? '').trim();
}
