/**
 * Scheduled database seed script.
 *
 * Runs twice daily via GitHub Actions to keep Supabase active and
 * accumulate realistic review data over time.
 *
 * Required repository secrets:
 *   SEED_OWNER_EMAIL    — test vehicle owner Supabase account
 *   SEED_OWNER_PASSWORD
 *   SEED_GARAGE_EMAIL   — test garage Supabase account
 *   SEED_GARAGE_PASSWORD
 *
 * No Cloud Run dependency — writes directly to Supabase.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const SUPABASE_URL = "https://szpgcvfemllcsajryyuv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGdjdmZlbWxsY3NhanJ5eXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA1NjUsImV4cCI6MjA4ODY0NjU2NX0.RA6BYTY10lc4Wok49pRo4jZPr4_UsfzytwYWv38DEp4";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session.user.id;
}

export async function getContractorId(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("contractors")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    throw new Error(`No contractor row found for user ${userId}: ${error?.message ?? "no data"}`);
  }
  return data.user_id;
}

// ─── Seed data pools ──────────────────────────────────────────────────────────

const COMMENTS = [
  "Brilliant service from start to finish. The work was done ahead of schedule and the car looks as good as new. Would not hesitate to use again.",
  "Really impressed with the quality of the repair. Clear communication throughout and the price was exactly as quoted. Very professional outfit.",
  "Solid job on the bodywork. You can't tell there was ever any damage. Dropped the car off in the morning and it was ready by lunchtime.",
  "Honest assessment, fair price, quality parts used. The garage kept me updated at every stage which made a real difference.",
  "Exceeded expectations. The mechanic explained exactly what the fault was and showed me the old part before fitting the new one. Top marks.",
  "Good work, done on time. The waiting area was clean and the staff were friendly. Minor quibble on the price but overall happy.",
  "Fast turnaround on the tyre replacement. They had the right size in stock and had me back on the road within the hour. Highly recommend.",
  "Excellent windscreen repair. The crack is completely invisible and the ADAS sensors were recalibrated properly. No dashboard warnings since.",
  "Very happy with the electrical diagnosis. They found the fault quickly, gave a clear quote and fixed it same day. Great value.",
  "Professional, reliable and reasonably priced. The car feels like a different machine after the service. Will be my first call next time.",
];

const PRIVATE_FEEDBACK = [
  "Waiting room could do with a refresh and the coffee machine was broken both times I visited.",
  "Slight delay on parts but they called ahead to warn me rather than leaving me waiting.",
  "Would be nice to get a written quote via email before work begins.",
  "Everything was great, no complaints at all.",
  "The invoice could be more itemised — hard to see the parts vs labour split.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rating(): number {
  // Weighted toward 4–5 stars to reflect a healthy marketplace
  return pick([3, 4, 4, 4, 5, 5, 5, 5]);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeedConfig {
  ownerEmail: string;
  ownerPassword: string;
  garageEmail: string;
  garagePassword: string;
}

export interface SeedResult {
  contractorId: string;
  ratingQuality: number;
  ratingCommunication: number;
  ratingCleanliness: number;
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  // Two separate clients so each holds its own session
  const garageClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });
  const ownerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  console.log("Signing in as garage...");
  const garageUserId = await signIn(garageClient, config.garageEmail, config.garagePassword);

  console.log("Looking up contractor record...");
  const contractorId = await getContractorId(garageClient, garageUserId);
  console.log(`  Contractor ID: ${contractorId}`);

  console.log("Signing in as vehicle owner...");
  await signIn(ownerClient, config.ownerEmail, config.ownerPassword);

  const ratingQuality = rating();
  const ratingCommunication = rating();
  const ratingCleanliness = rating();
  const comment = pick(COMMENTS);
  const privateFeedback = pick(PRIVATE_FEEDBACK);

  console.log(`Inserting review (quality=${ratingQuality} comms=${ratingCommunication} clean=${ratingCleanliness})...`);
  console.log(`  "${comment.slice(0, 60)}..."`);

  const { error } = await ownerClient.from("reviews").insert({
    contractor_id: contractorId,
    rating_quality: ratingQuality,
    rating_communication: ratingCommunication,
    rating_cleanliness: ratingCleanliness,
    comment,
    private_feedback: privateFeedback,
  });

  if (error) {
    throw new Error(`Review insert failed: ${error.message}`);
  }

  console.log("  Review inserted.");

  return { contractorId, ratingQuality, ratingCommunication, ratingCleanliness };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const {
    SEED_OWNER_EMAIL,
    SEED_OWNER_PASSWORD,
    SEED_GARAGE_EMAIL,
    SEED_GARAGE_PASSWORD,
  } = process.env;

  if (!SEED_OWNER_EMAIL || !SEED_OWNER_PASSWORD || !SEED_GARAGE_EMAIL || !SEED_GARAGE_PASSWORD) {
    console.error(
      "Missing required env vars: SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_GARAGE_EMAIL, SEED_GARAGE_PASSWORD"
    );
    process.exit(1);
  }

  runSeed({
    ownerEmail: SEED_OWNER_EMAIL,
    ownerPassword: SEED_OWNER_PASSWORD,
    garageEmail: SEED_GARAGE_EMAIL,
    garagePassword: SEED_GARAGE_PASSWORD,
  })
    .then((result) => {
      const overall = ((result.ratingQuality + result.ratingCommunication + result.ratingCleanliness) / 3).toFixed(2);
      console.log(`\nSeed complete:`);
      console.log(`  Contractor   : ${result.contractorId}`);
      console.log(`  Quality      : ${result.ratingQuality}`);
      console.log(`  Communication: ${result.ratingCommunication}`);
      console.log(`  Cleanliness  : ${result.ratingCleanliness}`);
      console.log(`  Overall      : ${overall}`);
    })
    .catch((err: Error) => {
      console.error(`Seed failed: ${err.message}`);
      process.exit(1);
    });
}
