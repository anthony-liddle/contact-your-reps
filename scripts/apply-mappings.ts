/**
 * Merges high-confidence suggestions from data/vote-mappings-suggestions.json
 * into data/vote-mappings.json.
 *
 * Only entries in the "high" bucket are applied. The "review" bucket requires
 * manual inspection before merging.
 *
 * Safe to run multiple times — existing mappings are never overwritten.
 *
 * Usage:
 *   pnpm run apply-mappings
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const VOTE_MAPPINGS_PATH = join(PROJECT_ROOT, 'data', 'vote-mappings.json');
const SUGGESTIONS_PATH = join(PROJECT_ROOT, 'data', 'vote-mappings-suggestions.json');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoteMapping {
  category: string;
  note: string;
  stance?: 'for' | 'against';
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
  high?: { [key: string]: SuggestionEntry };
  review?: { [key: string]: SuggestionEntry };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Read suggestions file
  if (!existsSync(SUGGESTIONS_PATH)) {
    console.error(
      'Error: data/vote-mappings-suggestions.json not found.\n' +
      'Run pnpm run map-votes first to generate suggestions.',
    );
    process.exit(1);
  }

  let suggestions: SuggestionsFile;
  try {
    suggestions = JSON.parse(readFileSync(SUGGESTIONS_PATH, 'utf-8')) as SuggestionsFile;
  } catch (err) {
    console.error(`Error reading suggestions file: ${String(err)}`);
    process.exit(1);
  }

  const highEntries = suggestions.high ?? {};
  const highCount = Object.keys(highEntries).length;

  if (highCount === 0) {
    console.log('No high-confidence suggestions to apply.');
    return;
  }

  // Read existing mappings
  let mappings: VoteMappings = {};
  if (existsSync(VOTE_MAPPINGS_PATH)) {
    try {
      mappings = JSON.parse(readFileSync(VOTE_MAPPINGS_PATH, 'utf-8')) as VoteMappings;
    } catch (err) {
      console.error(`Error reading vote-mappings.json: ${String(err)}`);
      process.exit(1);
    }
  }

  // Merge — never overwrite existing entries
  let added = 0;
  let skipped = 0;

  for (const [key, entry] of Object.entries(highEntries)) {
    if (key in mappings) {
      skipped++;
      continue;
    }
    // Strip confidence field — vote-mappings.json only stores category + note + stance
    mappings[key] = {
      category: entry.category,
      note: entry.note,
      ...(entry.stance ? { stance: entry.stance } : {}),
    };
    added++;
  }

  // Write updated mappings
  writeFileSync(VOTE_MAPPINGS_PATH, JSON.stringify(mappings, null, 2), 'utf-8');

  // Summary
  console.log('\n─────────────────────────────────────────');
  console.log('  apply-mappings summary');
  console.log('─────────────────────────────────────────');
  console.log(`  High-confidence suggestions: ${highCount}`);
  console.log(`  Added to vote-mappings.json: ${added}`);
  console.log(`  Skipped (already existed):   ${skipped}`);
  if (suggestions.review) {
    const reviewCount = Object.keys(suggestions.review).length;
    if (reviewCount > 0) {
      console.log(`  Review bucket (not applied): ${reviewCount}`);
      console.log('  Inspect data/vote-mappings-suggestions.json → "review" to apply manually.');
    }
  }
  console.log('─────────────────────────────────────────\n');
}

main();
