/**
 * Scheduled database seed script.
 *
 * Runs twice daily via GitHub Actions to keep the Cloud Run jobs API and
 * Supabase database active, and to build up realistic test content over time.
 *
 * Required environment variables:
 *   SEED_OWNER_EMAIL    — test vehicle owner account
 *   SEED_OWNER_PASSWORD
 *   SEED_GARAGE_EMAIL   — test garage account
 *   SEED_GARAGE_PASSWORD
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const SUPABASE_URL = "https://szpgcvfemllcsajryyuv.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cGdjdmZlbWxsY3NhanJ5eXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA1NjUsImV4cCI6MjA4ODY0NjU2NX0.RA6BYTY10lc4Wok49pRo4jZPr4_UsfzytwYWv38DEp4";
export const CLOUD_RUN_BASE =
  "https://stable-gig-cars-374485351183.europe-west1.run.app";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

export async function cloudRunRequest<T = unknown>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${CLOUD_RUN_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} → ${res.status}: ${body || "request failed"}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Seed data pools ──────────────────────────────────────────────────────────

const VEHICLES = [
  { make: "BMW", model: "3 Series", year: 2019 },
  { make: "Ford", model: "Focus", year: 2020 },
  { make: "Toyota", model: "Corolla", year: 2021 },
  { make: "Audi", model: "A4", year: 2018 },
  { make: "Volkswagen", model: "Golf", year: 2022 },
  { make: "Honda", model: "Civic", year: 2020 },
  { make: "Vauxhall", model: "Astra", year: 2019 },
];

const ISSUES = [
  {
    category: "Bodywork",
    description: "Front bumper scuff from parking incident",
    severity: "minor",
    cost_low: 150,
    cost_high: 350,
  },
  {
    category: "Mechanical",
    description: "Engine warning light on, rough idle at low revs",
    severity: "moderate",
    cost_low: 200,
    cost_high: 600,
  },
  {
    category: "Tyres",
    description: "Two front tyres worn below legal limit",
    severity: "urgent",
    cost_low: 180,
    cost_high: 280,
  },
  {
    category: "Windscreen",
    description: "Crack spreading from stone chip near driver eyeline",
    severity: "urgent",
    cost_low: 100,
    cost_high: 250,
  },
  {
    category: "Electrical",
    description: "Dashboard lights flickering, possible alternator fault",
    severity: "moderate",
    cost_low: 250,
    cost_high: 500,
  },
  {
    category: "Bodywork",
    description: "Driver door dent and scratch from car park incident",
    severity: "minor",
    cost_low: 200,
    cost_high: 450,
  },
  {
    category: "Interior",
    description: "Seat trim torn, centre console damaged",
    severity: "minor",
    cost_low: 120,
    cost_high: 300,
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main seed function ───────────────────────────────────────────────────────

export interface SeedConfig {
  ownerEmail: string;
  ownerPassword: string;
  garageEmail: string;
  garagePassword: string;
}

export interface SeedResult {
  jobId: string;
  vehicle: string;
  issue: string;
  bidAmountPence: number;
  milestonesCreated: number;
}

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  // Sign in both users upfront — JWTs are valid for 1 hour, enough for the run
  console.log("Signing in as vehicle owner...");
  const ownerToken = await signIn(supabase, config.ownerEmail, config.ownerPassword);

  console.log("Signing in as garage...");
  const garageToken = await signIn(supabase, config.garageEmail, config.garagePassword);

  // ── Step 1: Owner creates and publishes a job ──────────────────────────────
  const vehicle = pick(VEHICLES);
  const issue = pick(ISSUES);
  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  console.log(`Creating job: ${vehicleLabel} — ${issue.category} — ${issue.description}`);

  const job = await cloudRunRequest<{ id: string; status: string }>(
    "/jobs",
    ownerToken,
    {
      method: "POST",
      body: JSON.stringify({
        analysis_result: {
          vehicle: vehicleLabel,
          category: issue.category,
          description: issue.description,
          severity: issue.severity,
          estimated_cost_gbp: { low: issue.cost_low, high: issue.cost_high },
          seed_run: new Date().toISOString(),
        },
      }),
    }
  );
  console.log(`  Job created: ${job.id} (${job.status})`);

  await cloudRunRequest(`/jobs/${job.id}`, ownerToken, {
    method: "PATCH",
    body: JSON.stringify({ status: "open" }),
  });
  console.log("  Job published (open)");

  // ── Step 2: Garage submits a bid ───────────────────────────────────────────
  const bidAmountPence =
    (Math.floor(Math.random() * (issue.cost_high - issue.cost_low)) + issue.cost_low) * 100;

  console.log(`Submitting bid: £${bidAmountPence / 100}`);

  const bid = await cloudRunRequest<{ id: string }>(
    `/jobs/${job.id}/bids`,
    garageToken,
    {
      method: "POST",
      body: JSON.stringify({
        amount_pence: bidAmountPence,
        note: `We can handle the ${issue.category.toLowerCase()} work on your ${vehicleLabel}. OEM parts, 12-month warranty on all labour.`,
      }),
    }
  );
  console.log(`  Bid submitted: ${bid.id}`);

  // ── Step 3: Owner accepts the bid ──────────────────────────────────────────
  console.log("Owner accepting bid...");
  await cloudRunRequest(`/jobs/${job.id}/bids/${bid.id}`, ownerToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "accept" }),
  });
  console.log("  Bid accepted (job awarded)");

  // ── Step 4: Garage creates milestones ──────────────────────────────────────
  console.log("Garage creating milestones...");
  const milestones = await cloudRunRequest<Array<{ id: string; title: string }>>(
    `/jobs/${job.id}/milestones`,
    garageToken,
    {
      method: "POST",
      body: JSON.stringify({
        milestones: [
          { title: "Assessment & parts order", order_index: 0 },
          { title: "Repair work", order_index: 1 },
          { title: "Quality check & handover", order_index: 2 },
        ],
      }),
    }
  );
  console.log(`  Created ${milestones.length} milestones`);

  // ── Step 5: Garage submits a milestone photo ───────────────────────────────
  console.log("Garage submitting progress photo...");
  // 1×1 transparent PNG as a stable placeholder that requires no external fetch
  const placeholderImage =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  await cloudRunRequest(
    `/jobs/${job.id}/milestones/${milestones[0].id}/photos`,
    garageToken,
    {
      method: "POST",
      body: JSON.stringify({
        image_source: placeholderImage,
        note: "Initial assessment complete. Parts ordered and confirmed in stock.",
      }),
    }
  );
  console.log(`  Photo submitted for: ${milestones[0].title}`);

  // ── Step 6: Owner approves the first milestone ─────────────────────────────
  console.log("Owner approving milestone...");
  await cloudRunRequest(
    `/jobs/${job.id}/milestones/${milestones[0].id}`,
    ownerToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "approve" }),
    }
  );
  console.log("  Milestone approved");

  return {
    jobId: job.id,
    vehicle: vehicleLabel,
    issue: `${issue.category}: ${issue.description}`,
    bidAmountPence,
    milestonesCreated: milestones.length,
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_GARAGE_EMAIL, SEED_GARAGE_PASSWORD } =
    process.env;

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
      console.log(`\nSeed complete:`);
      console.log(`  Job ID       : ${result.jobId}`);
      console.log(`  Vehicle      : ${result.vehicle}`);
      console.log(`  Issue        : ${result.issue}`);
      console.log(`  Bid          : £${result.bidAmountPence / 100}`);
      console.log(`  Milestones   : ${result.milestonesCreated}`);
    })
    .catch((err: Error) => {
      console.error(`Seed failed: ${err.message}`);
      process.exit(1);
    });
}
