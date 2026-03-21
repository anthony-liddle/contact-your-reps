/**
 * Vote categorization pipeline.
 *
 * Reads all cached vote data, enriches each vote with bill details from the
 * Congress.gov API, then calls the Anthropic API in batches of 20 to suggest
 * issue category mappings. Writes results to
 * data/vote-mappings-suggestions.json for manual review.
 *
 * Usage:
 *   pnpm run map-votes
 *   pnpm run map-votes -- --reps S000344,W000187,P000197
 *   pnpm run map-votes -- --reps S000344 --congress 118
 *
 * The --reps flag accepts a comma-separated list of bioguide IDs. Votes for
 * those members are fetched from Congress.gov (and cached) before processing
 * if they are not already in .cache/voteprint/.
 *
 * The --congress flag specifies which Congress number to fetch votes from.
 * Defaults to 119 if omitted.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Load .env before any functions that read env vars
// ---------------------------------------------------------------------------

function loadDotEnv(): void {
  const envPath = existsSync(join(process.cwd(), '.env.local'))
    ? join(process.cwd(), '.env.local')
    : join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

// Ensure the fs cache path is used when running this script locally,
// even if the .env file doesn't set NODE_ENV explicitly.
if (!process.env.NODE_ENV) {
  (process.env as Record<string, string>).NODE_ENV = 'development';
}

loadDotEnv();

// ---------------------------------------------------------------------------
// Imports (after env is loaded so env-dependent initialisation works)
// ---------------------------------------------------------------------------

import { fetchMemberVotes } from '../lib/voteprint/fetchMemberVotes';
import { issues } from '../data/issues';
import type { RawCongressVote } from '../lib/voteprint/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = process.cwd();
const CACHE_DIR = join(PROJECT_ROOT, '.cache', 'voteprint');
const BILL_CACHE_DIR = join(PROJECT_ROOT, '.cache', 'bills');
const VOTE_MAPPINGS_PATH = join(PROJECT_ROOT, 'data', 'vote-mappings.json');
const SUGGESTIONS_PATH = join(PROJECT_ROOT, 'data', 'vote-mappings-suggestions.json');

const ANTHROPIC_BATCH_SIZE = 20;
const ANTHROPIC_BATCH_DELAY_MS = 500;
const BILL_FETCH_BATCH_SIZE = 10;
const BILL_FETCH_DELAY_MS = 200;
const BILL_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const MODEL = 'claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoteMapping {
  category: string;
  note: string;
}

interface VoteMappings {
  [key: string]: VoteMapping;
}

interface SuggestionEntry {
  category: string;
  note: string;
  stance?: 'for' | 'against';
  confidence?: string;
}

interface SuggestionsFile {
  high: { [key: string]: SuggestionEntry };
  review: { [key: string]: SuggestionEntry };
}

interface ApiSuggestion {
  key: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  stance: 'for' | 'against';
  note: string;
}

/** Raw vote data as read from the vote cache, before bill enrichment. */
interface RawVoteData {
  key: string;
  question: string;
  description: string;
  date: string;
  /** Bill number string (e.g. "H.R. 3424"), or null for votes with no attached bill. */
  billNumber: string | null;
}

/** Vote data enriched with Congress.gov bill details, ready for the categorization prompt. */
interface EnrichedVote {
  key: string;
  question: string;
  date: string;
  billNumber?: string;
  billTitle?: string;
  policyArea?: string;
  latestAction?: string;
}

interface BillDetails {
  title: string;
  policyArea: string;
  latestAction: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Builds the canonical vote key: "{congress}-house-{rollCall}". */
function voteKey(vote: RawCongressVote): string {
  return `${vote.congress}-${vote.chamber.toLowerCase()}-${vote.rollCall}`;
}

// ---------------------------------------------------------------------------
// Bill cache (separate from vote cache — 7-day TTL, .cache/bills/)
// ---------------------------------------------------------------------------

function readBillCache(key: string): BillDetails | null {
  const path = join(BILL_CACHE_DIR, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    const envelope = JSON.parse(raw) as { cachedAt: string; data: BillDetails };
    const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
    if (ageMs > BILL_CACHE_TTL_MS) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

function writeBillCache(key: string, data: BillDetails): void {
  try {
    mkdirSync(BILL_CACHE_DIR, { recursive: true });
    const envelope = { cachedAt: new Date().toISOString(), data };
    writeFileSync(
      join(BILL_CACHE_DIR, `${key}.json`),
      JSON.stringify(envelope, null, 2),
      'utf-8',
    );
  } catch { /* silent — cache write failure must never crash the script */ }
}

// ---------------------------------------------------------------------------
// Bill number parsing
// ---------------------------------------------------------------------------

// Ordered most-specific first so longer prefixes match before shorter ones.
// e.g. "H.Con.Res." must come before "H.Res." which must come before "H.R."
const BILL_TYPE_MAP: [string, string][] = [
  ['H.Con.Res.', 'hconres'],
  ['H.J.Res.', 'hjres'],
  ['H.Res.', 'hres'],
  ['H.R.', 'hr'],
  ['S.Con.Res.', 'sconres'],
  ['S.J.Res.', 'sjres'],
  ['S.Res.', 'sres'],
  ['S.', 's'],
];

/**
 * Parses a formatted bill number string into the type + number components
 * needed to construct a Congress.gov API URL.
 *
 * Examples:
 *   "H.R. 3424"      → { type: "hr",      number: "3424" }
 *   "H.Res. 780"     → { type: "hres",    number: "780"  }
 *   "H.J.Res. 7"     → { type: "hjres",   number: "7"    }
 *   "H.Con.Res. 38"  → { type: "hconres", number: "38"   }
 *   "S. 723"         → { type: "s",       number: "723"  }
 *   "S.Res. 100"     → { type: "sres",    number: "100"  }
 */
export function parseBillNumber(
  billNumber: string,
): { type: string; number: string } | null {
  const trimmed = billNumber.trim();
  for (const [prefix, type] of BILL_TYPE_MAP) {
    if (trimmed.startsWith(prefix)) {
      const number = trimmed.slice(prefix.length).trim();
      if (/^\d+$/.test(number)) {
        return { type, number };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bill details fetch
// ---------------------------------------------------------------------------

/**
 * Fetches bill details from Congress.gov for a single bill.
 * Reads from / writes to the bill cache (.cache/bills/).
 * Returns null on error or if the bill is not found.
 */
async function fetchBillDetails(
  congress: number,
  type: string,
  number: string,
  apiKey: string,
): Promise<BillDetails | null> {
  const cacheKey = `bill-${congress}-${type}-${number}`;
  const cached = readBillCache(cacheKey);
  if (cached) return cached;

  const url = `${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}?api_key=${encodeURIComponent(apiKey)}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status !== 404) {
        console.warn(`    Bill ${type}${number}: API returned ${response.status}`);
      }
      return null;
    }

    const data = await response.json() as {
      bill: {
        title?: string;
        policyArea?: { name?: string };
        latestAction?: { text?: string };
      };
    };

    const bill = data.bill ?? {};
    const details: BillDetails = {
      title: bill.title ?? '',
      policyArea: bill.policyArea?.name ?? '',
      latestAction: bill.latestAction?.text ?? '',
    };

    writeBillCache(cacheKey, details);
    return details;
  } catch (err) {
    console.warn(`    Bill ${type}${number}: fetch error — ${String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vote enrichment
// ---------------------------------------------------------------------------

interface EnrichmentStats {
  fromApi: number;
  fromCache: number;
  notFound: number;
}

/**
 * Enriches a list of raw votes with bill details, returning EnrichedVote[]
 * ready for the categorization prompt. Fetches in batches of 10 with a
 * 200ms delay between batches.
 */
async function enrichVotes(
  votes: RawVoteData[],
  congress: number,
  congressApiKey: string,
): Promise<{ enriched: EnrichedVote[]; stats: EnrichmentStats }> {
  const stats: EnrichmentStats = { fromApi: 0, fromCache: 0, notFound: 0 };

  // Identify which votes need a bill fetch (unique bill numbers only)
  const billsToFetch = new Map<string, { type: string; number: string }>();
  for (const vote of votes) {
    if (!vote.billNumber) continue;
    const parsed = parseBillNumber(vote.billNumber);
    if (!parsed) continue;
    const cacheKey = `bill-${congress}-${parsed.type}-${parsed.number}`;
    if (!billsToFetch.has(cacheKey)) {
      billsToFetch.set(cacheKey, parsed);
    }
  }

  // Fetch bill details in batches
  const billDetailsMap = new Map<string, BillDetails | null>();
  const billEntries = [...billsToFetch.entries()];

  if (billEntries.length > 0) {
    process.stdout.write(`  Fetching details for ${billEntries.length} unique bill(s)…`);

    for (let i = 0; i < billEntries.length; i += BILL_FETCH_BATCH_SIZE) {
      const batch = billEntries.slice(i, i + BILL_FETCH_BATCH_SIZE);

      await Promise.all(
        batch.map(async ([cacheKey, parsed]) => {
          // Check cache first
          const cached = readBillCache(cacheKey);
          if (cached) {
            billDetailsMap.set(cacheKey, cached);
            stats.fromCache++;
            return;
          }
          // Fetch from API
          const details = await fetchBillDetails(congress, parsed.type, parsed.number, congressApiKey);
          billDetailsMap.set(cacheKey, details);
          if (details) {
            stats.fromApi++;
          } else {
            stats.notFound++;
          }
        }),
      );

      if (i + BILL_FETCH_BATCH_SIZE < billEntries.length) {
        await sleep(BILL_FETCH_DELAY_MS);
      }
    }

    console.log(` done (${stats.fromApi} fetched, ${stats.fromCache} cached, ${stats.notFound} not found)`);
  }

  // Build enriched votes
  const enriched: EnrichedVote[] = votes.map((vote) => {
    const ev: EnrichedVote = {
      key: vote.key,
      question: vote.question,
      date: vote.date.slice(0, 10), // ISO date only, no time
    };

    if (vote.billNumber) {
      ev.billNumber = vote.billNumber;
      const parsed = parseBillNumber(vote.billNumber);
      if (parsed) {
        const cacheKey = `bill-${congress}-${parsed.type}-${parsed.number}`;
        const details = billDetailsMap.get(cacheKey);
        if (details) {
          if (details.title) ev.billTitle = details.title;
          if (details.policyArea) ev.policyArea = details.policyArea;
          if (details.latestAction) ev.latestAction = details.latestAction;
        }
      }
    }

    return ev;
  });

  return { enriched, stats };
}

// ---------------------------------------------------------------------------
// Vote cache reader
// ---------------------------------------------------------------------------

/** Reads all cache files and returns all unique votes keyed by vote key. */
function readAllCachedVotes(): Map<string, RawVoteData> {
  if (!existsSync(CACHE_DIR)) {
    return new Map();
  }

  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'));
  const voteMap = new Map<string, RawVoteData>();

  for (const file of files) {
    try {
      const raw = readFileSync(join(CACHE_DIR, file), 'utf-8');
      const envelope = JSON.parse(raw) as { cachedAt: string; data: RawCongressVote[] };
      const votes: RawCongressVote[] = envelope.data ?? [];

      for (const vote of votes) {
        const key = voteKey(vote);
        if (!voteMap.has(key)) {
          voteMap.set(key, {
            key,
            question: vote.question ?? '',
            description: vote.description ?? '',
            date: vote.date ?? '',
            billNumber: vote.bill?.number ?? null,
          });
        }
      }
    } catch {
      console.warn(`  Warning: could not parse ${file}, skipping`);
    }
  }

  return voteMap;
}

/** Loads the existing vote-mappings.json. Returns empty object if not found. */
function loadVoteMappings(): VoteMappings {
  if (!existsSync(VOTE_MAPPINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(VOTE_MAPPINGS_PATH, 'utf-8')) as VoteMappings;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Anthropic categorization
// ---------------------------------------------------------------------------

/** Builds the system prompt with all 19 issue categories. */
function buildSystemPrompt(): string {
  const categoryList = issues
    .map((i) => `  - ${i.id}: ${i.title} — ${i.description}`)
    .join('\n');

  return `You are categorizing U.S. Congressional roll call votes into 
issue categories for a civic engagement tool. You will be given a list 
of votes and must assign each one to the single most relevant category 
from the provided list, or "none" if no category fits well.

Categories:
${categoryList}

Rules:
- Assign exactly one category per vote, or "none" if it does not fit
- Procedural votes (motions to adjourn, quorum calls, rule adoptions 
  with no policy content) should be "none"
- When a vote touches multiple categories, pick the primary one
- Base your decision on the question text and description only
- "stance" describes the bill itself, not how any member voted.
  "for" means a YEA vote on this bill advances a progressive or
  protective position on the issue (expanding rights, protecting
  the environment, supporting workers, strengthening oversight, etc.).
  "against" means a YEA vote on this bill opposes or restricts
  that position (rolling back protections, expanding enforcement,
  reducing oversight, restricting access, etc.).
  Do not consider how any member actually voted — only characterize
  the bill's direction.
- Return ONLY valid JSON, no other text

Return a JSON array in this exact shape:
[
  {
    "key": "{congress}-{chamber}-{rollCall}",
    "category": "{issue-id or none}",
    "confidence": "high" | "medium" | "low",
    "stance": "for" | "against",
    "note": "{one sentence explaining what this vote was about}"
  }
]`;
}

/**
 * Calls the Anthropic API to categorize a batch of votes.
 * Returns the parsed suggestion array, or null on error.
 */
async function categorizeBatch(
  batch: EnrichedVote[],
  systemPrompt: string,
  apiKey: string,
): Promise<ApiSuggestion[] | null> {
  const userContent = JSON.stringify(batch, null, 2);

  let responseText: string;
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`  API error ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json() as { content: { type: string; text: string }[] };
    responseText = data.content?.[0]?.text ?? '';
  } catch (err) {
    console.error(`  Network error: ${String(err)}`);
    return null;
  }

  // Strip markdown code fences if the model wrapped the JSON
  const cleaned = responseText
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  try {
    return JSON.parse(cleaned) as ApiSuggestion[];
  } catch {
    console.error('  Malformed JSON from API. Raw response:');
    console.error('  ' + responseText.slice(0, 500));
    return null;
  }
}

// ---------------------------------------------------------------------------
// --reps flag handling
// ---------------------------------------------------------------------------

function parseRepsFlag(): string[] {
  const repsIdx = process.argv.indexOf('--reps');
  if (repsIdx < 0) return [];
  const val = process.argv[repsIdx + 1];
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseCongressFlag(): number {
  // Support both --congress 118 and --congress=118
  const spaceIdx = process.argv.indexOf('--congress');
  if (spaceIdx >= 0) {
    const val = parseInt(process.argv[spaceIdx + 1], 10);
    if (!isNaN(val)) return val;
  }
  const eqArg = process.argv.find((a) => a.startsWith('--congress='));
  if (eqArg) {
    const val = parseInt(eqArg.split('=')[1], 10);
    if (!isNaN(val)) return val;
  }
  return 119;
}

function memberCachePath(bioguideId: string, congress: number): string {
  return join(CACHE_DIR, `member-${bioguideId}-congress-${congress}.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey || anthropicKey === '<KEY>') {
    console.error(
      'Error: ANTHROPIC_API_KEY is not set.\n' +
      'Add it to your .env file: ANTHROPIC_API_KEY=your_key_here',
    );
    process.exit(1);
  }

  const congressApiKey = process.env.CONGRESS_GOV_API_KEY ?? '';
  const repIds = parseRepsFlag();
  const congress = parseCongressFlag();

  // ── Step 1: Fetch uncached reps (if --reps provided) ─────────────────────

  let repsFetched = 0;
  let repsAlreadyCached = 0;

  if (repIds.length > 0) {
    console.log(`\nFetching vote data for ${repIds.length} rep(s)…`);

    if (!congressApiKey) {
      console.error(
        'Error: CONGRESS_GOV_API_KEY is required when using --reps.\n' +
        'Add it to your .env file.',
      );
      process.exit(1);
    }

    for (const bioguideId of repIds) {
      const cachePath = memberCachePath(bioguideId, congress);
      if (existsSync(cachePath)) {
        console.log(`  ${bioguideId}: already in cache`);
        repsAlreadyCached++;
      } else {
        console.log(`  ${bioguideId}: fetching from Congress.gov…`);
        try {
          await fetchMemberVotes(bioguideId, congress);
          console.log(`  ${bioguideId}: cached`);
          repsFetched++;
        } catch (err) {
          console.error(`  ${bioguideId}: fetch failed — ${String(err)}`);
        }
      }
    }
  }

  // ── Step 2: Read all cached votes ─────────────────────────────────────────

  if (
    !existsSync(CACHE_DIR) ||
    readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json')).length === 0
  ) {
    console.error(
      '\nError: No cached vote data found in .cache/voteprint/.\n' +
      'Visit some representative pages in the app first to populate the cache,\n' +
      'or run: pnpm run map-votes -- --reps <BIOGUIDE_ID>',
    );
    process.exit(1);
  }

  console.log('\nReading cached votes…');
  const allVotes = readAllCachedVotes();
  console.log(`  ${allVotes.size} total unique votes in cache`);

  // ── Step 3: Filter to unmapped votes with usable content ──────────────────

  const existingMappings = loadVoteMappings();
  const alreadyMapped = new Set(Object.keys(existingMappings));

  const toProcess: RawVoteData[] = [];
  let skippedMapped = 0;
  let skippedNoContent = 0;

  for (const [key, vote] of allVotes) {
    if (alreadyMapped.has(key)) {
      skippedMapped++;
      continue;
    }
    // Skip only if both question AND description are empty — a bill number
    // alone is enough to enrich and categorize
    if (!vote.question.trim() && !vote.description.trim() && !vote.billNumber) {
      skippedNoContent++;
      continue;
    }
    toProcess.push(vote);
  }

  console.log(`  ${skippedMapped} already mapped (skipped)`);
  console.log(`  ${skippedNoContent} skipped (no content)`);
  console.log(`  ${toProcess.length} votes to process`);

  if (toProcess.length === 0) {
    console.log('\nNothing to do — all votes are already mapped.');
    printSummary({
      congress,
      totalInCache: allVotes.size,
      alreadyMapped: skippedMapped,
      processed: 0,
      highCount: 0,
      reviewCount: 0,
      skippedNoContent,
      repsFetched,
      repsAlreadyCached,
      billsFromApi: 0,
      billsFromCache: 0,
      billsNotFound: 0,
    });
    return;
  }

  // ── Step 4: Enrich votes with bill details ────────────────────────────────

  let enriched: EnrichedVote[] = [];
  let billStats: EnrichmentStats = { fromApi: 0, fromCache: 0, notFound: 0 };

  if (congressApiKey) {
    console.log('\nEnriching votes with bill details…');
    const result = await enrichVotes(toProcess, congress, congressApiKey);
    enriched = result.enriched;
    billStats = result.stats;
  } else {
    console.log('\nNote: CONGRESS_GOV_API_KEY not set — skipping bill enrichment.');
    console.log('  Category suggestions will be based on vote question text only.');
    enriched = toProcess.map((v) => ({
      key: v.key,
      question: v.question,
      date: v.date.slice(0, 10),
      ...(v.billNumber ? { billNumber: v.billNumber } : {}),
    }));
  }

  // ── Step 5: Categorize via Anthropic API ──────────────────────────────────

  const systemPrompt = buildSystemPrompt();
  const batches: EnrichedVote[][] = [];
  for (let i = 0; i < enriched.length; i += ANTHROPIC_BATCH_SIZE) {
    batches.push(enriched.slice(i, i + ANTHROPIC_BATCH_SIZE));
  }

  console.log(
    `\nCategorizing ${enriched.length} votes in ${batches.length} batch(es) via Anthropic API…`,
  );

  const highSuggestions: Record<string, SuggestionEntry> = {};
  const reviewSuggestions: Record<string, SuggestionEntry> = {};

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} votes)… `);

    const suggestions = await categorizeBatch(batch, systemPrompt, anthropicKey);

    if (!suggestions) {
      console.log('failed, skipping batch');
    } else {
      let batchHigh = 0;
      let batchReview = 0;

      for (const s of suggestions) {
        if (!s.key || s.category === 'none' || !s.category || !s.stance) continue;
        const entry: SuggestionEntry = {
          category: s.category,
          note: s.note ?? '',
          stance: s.stance,
        };
        if (s.confidence === 'high') {
          highSuggestions[s.key] = entry;
          batchHigh++;
        } else {
          reviewSuggestions[s.key] = { ...entry, confidence: s.confidence };
          batchReview++;
        }
      }

      console.log(`done (${batchHigh} high, ${batchReview} review)`);
    }

    if (i < batches.length - 1) {
      await sleep(ANTHROPIC_BATCH_DELAY_MS);
    }
  }

  // ── Step 6: Write suggestions file ────────────────────────────────────────

  const suggestionsFile: SuggestionsFile = {
    high: highSuggestions,
    review: reviewSuggestions,
  };

  writeFileSync(SUGGESTIONS_PATH, JSON.stringify(suggestionsFile, null, 2), 'utf-8');

  // ── Step 7: Print summary ─────────────────────────────────────────────────

  printSummary({
    congress,
    totalInCache: allVotes.size,
    alreadyMapped: skippedMapped,
    processed: toProcess.length,
    highCount: Object.keys(highSuggestions).length,
    reviewCount: Object.keys(reviewSuggestions).length,
    skippedNoContent,
    repsFetched,
    repsAlreadyCached,
    billsFromApi: billStats.fromApi,
    billsFromCache: billStats.fromCache,
    billsNotFound: billStats.notFound,
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

interface SummaryArgs {
  congress: number;
  totalInCache: number;
  alreadyMapped: number;
  processed: number;
  highCount: number;
  reviewCount: number;
  skippedNoContent: number;
  repsFetched: number;
  repsAlreadyCached: number;
  billsFromApi: number;
  billsFromCache: number;
  billsNotFound: number;
}

function printSummary(args: SummaryArgs): void {
  const {
    congress, totalInCache, alreadyMapped, processed, highCount, reviewCount,
    skippedNoContent, repsFetched, repsAlreadyCached,
    billsFromApi, billsFromCache, billsNotFound,
  } = args;

  console.log('\n─────────────────────────────────────────');
  console.log('  Summary');
  console.log('─────────────────────────────────────────');
  console.log(`  Congress:                       ${congress}`);
  if (repsFetched > 0 || repsAlreadyCached > 0) {
    console.log(`  Reps fetched this run:          ${repsFetched}`);
    console.log(`  Reps already in cache:          ${repsAlreadyCached}`);
  }
  console.log(`  Total votes in cache:           ${totalInCache}`);
  console.log(`  Already mapped (skipped):       ${alreadyMapped}`);
  console.log(`  Processed this run:             ${processed}`);
  console.log(`  Bills fetched from API:         ${billsFromApi}`);
  console.log(`  Bills from cache:               ${billsFromCache}`);
  console.log(`  Bills not found (no bill/fail): ${billsNotFound}`);
  console.log(`  High confidence suggestions:    ${highCount}`);
  console.log(`  Needs review:                   ${reviewCount}`);
  console.log(`  Skipped (no content):           ${skippedNoContent}`);
  if (processed > 0) {
    console.log(`\n  Output: data/vote-mappings-suggestions.json`);
    console.log('  Review high-confidence entries, then run:');
    console.log('    pnpm run apply-mappings');
  }
  console.log('─────────────────────────────────────────\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
