/**
 * Scheduled database seed script.
 *
 * Runs twice daily via GitHub Actions to keep the Cloud Run API and
 * Supabase database active, and to accumulate realistic analysis records.
 *
 * Required environment variables:
 *   SEED_OWNER_EMAIL    — test vehicle owner Supabase account
 *   SEED_OWNER_PASSWORD
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
    description: "Front bumper has a nasty scuff from a parking incident in a supermarket car park, paint is scratched through to the primer and there is light cracking in the plastic.",
  },
  {
    category: "Mechanical",
    description: "Engine warning light came on three days ago and the car now has a rough idle at low revs, particularly noticeable when stopped at traffic lights in the morning.",
  },
  {
    category: "Tyres",
    description: "Both front tyres are worn well below the legal 1.6mm tread limit and need replacing urgently before the next MOT, which is due in six weeks.",
  },
  {
    category: "Windscreen",
    description: "A stone chip on the motorway two weeks ago has spread into a crack about 15cm long directly in the driver eyeline and is now failing the MOT visibility test.",
  },
  {
    category: "Electrical",
    description: "Multiple dashboard warning lights are flickering on and off intermittently, the battery seems to drain faster than usual and the alternator may be on its way out.",
  },
  {
    category: "Bodywork",
    description: "Driver door has a dent the size of a fist with a deep scratch running through it, most likely from a neighbouring car door swinging open in a car park.",
  },
  {
    category: "Interior",
    description: "Driver seat bolster is badly torn with foam showing through, and the centre console lid hinge has snapped so it no longer stays closed when driving over bumps.",
  },
];

// 200×200 solid gray PNG — minimum size accepted by the analyse/photos endpoint
export const PLACEHOLDER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAIAAAAiOjnJAAACEUlEQVR4nO3SQQkAMAzAwIqdfw1VEQblTkEemQeB+R3ATcYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEsYiYSwSxiJhLBLGImEsEgvYQSW60ed6aQAAAABJRU5ErkJggg==";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeedConfig {
  ownerEmail: string;
  ownerPassword: string;
}

export interface SeedResult {
  vehicle: string;
  category: string;
  likelyIssue: string;
  urgencyScore: number;
}

export interface AnalysisResponse {
  likely_issue: string;
  urgency_score: number;
  required_tools: string[];
  estimated_parts: string[];
}

// ─── Main seed function ───────────────────────────────────────────────────────

export async function runSeed(config: SeedConfig): Promise<SeedResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  console.log("Signing in as vehicle owner...");
  const ownerToken = await signIn(supabase, config.ownerEmail, config.ownerPassword);

  const vehicle = pick(VEHICLES);
  const issue = pick(ISSUES);
  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  console.log(`Analysing: ${vehicleLabel} — ${issue.category}`);
  console.log(`  ${issue.description}`);

  const analysis = await cloudRunRequest<AnalysisResponse>(
    "/analyse/photos",
    ownerToken,
    {
      method: "POST",
      body: JSON.stringify({
        images: [PLACEHOLDER_IMAGE],
        description: `${vehicleLabel}. ${issue.description}`,
        trade_category: issue.category.toLowerCase(),
      }),
    }
  );

  console.log(`  Likely issue : ${analysis.likely_issue}`);
  console.log(`  Urgency      : ${analysis.urgency_score}/10`);
  console.log(`  Tools needed : ${analysis.required_tools?.join(", ") || "none listed"}`);

  return {
    vehicle: vehicleLabel,
    category: issue.category,
    likelyIssue: analysis.likely_issue,
    urgencyScore: analysis.urgency_score,
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD } = process.env;

  if (!SEED_OWNER_EMAIL || !SEED_OWNER_PASSWORD) {
    console.error("Missing required env vars: SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD");
    process.exit(1);
  }

  runSeed({ ownerEmail: SEED_OWNER_EMAIL, ownerPassword: SEED_OWNER_PASSWORD })
    .then((result) => {
      console.log(`\nSeed complete:`);
      console.log(`  Vehicle      : ${result.vehicle}`);
      console.log(`  Category     : ${result.category}`);
      console.log(`  Likely issue : ${result.likelyIssue}`);
      console.log(`  Urgency      : ${result.urgencyScore}/10`);
    })
    .catch((err: Error) => {
      console.error(`Seed failed: ${err.message}`);
      process.exit(1);
    });
}
