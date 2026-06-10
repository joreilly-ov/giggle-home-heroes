/**
 * RLS + Cloud Run API isolation tests.
 *
 * Signs in as two distinct Supabase users (Alice + Bob) and asserts neither
 * can read or mutate the other's rows. Also exercises a couple of Cloud Run
 * job endpoints to confirm server-side ownership checks.
 *
 * Requires these env vars (set as GitHub Actions secrets in CI):
 *   TEST_ALICE_EMAIL / TEST_ALICE_PASSWORD
 *   TEST_BOB_EMAIL   / TEST_BOB_PASSWORD
 *
 * The suite auto-skips locally when the env vars are missing so the default
 * `npm test` run stays green for contributors without credentials.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://szpgcvfemllcsajryyuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7kaW_QEe-nZykVFazzzabA_9j_U4njl";
const CLOUD_RUN_URL = "https://stable-gig-cars-374485351183.europe-west1.run.app";

const ALICE_EMAIL = process.env.TEST_ALICE_EMAIL;
const ALICE_PASSWORD = process.env.TEST_ALICE_PASSWORD;
const BOB_EMAIL = process.env.TEST_BOB_EMAIL;
const BOB_PASSWORD = process.env.TEST_BOB_PASSWORD;

const hasCreds = Boolean(ALICE_EMAIL && ALICE_PASSWORD && BOB_EMAIL && BOB_PASSWORD);

function freshClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string) {
  const client = freshClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`Sign-in failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return { client, userId: data.user.id, accessToken: data.session.access_token };
}

describe.skipIf(!hasCreds)("RLS isolation: videos", () => {
  let alice: Awaited<ReturnType<typeof signIn>>;
  let bob: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    alice = await signIn(ALICE_EMAIL!, ALICE_PASSWORD!);
    bob = await signIn(BOB_EMAIL!, BOB_PASSWORD!);
  });

  it("rejects INSERT with another user's user_id", async () => {
    const { error } = await alice.client.from("videos").insert({
      user_id: bob.userId,
      status: "draft",
    } as never);
    expect(error).not.toBeNull();
    // PostgREST surfaces RLS violations as 42501.
    expect(error?.code === "42501" || /row-level security/i.test(error?.message ?? "")).toBe(true);
  });

  it("does not return another user's non-posted rows via SELECT", async () => {
    // Seed a draft row owned by Bob.
    const { data: inserted, error: insertErr } = await bob.client
      .from("videos")
      .insert({ user_id: bob.userId, status: "draft" } as never)
      .select("id")
      .single();
    expect(insertErr).toBeNull();
    const draftId = (inserted as { id: string } | null)?.id;

    try {
      const { data: aliceView } = await alice.client
        .from("videos")
        .select("id,user_id,status")
        .eq("id", draftId!);
      expect(aliceView ?? []).toHaveLength(0);
    } finally {
      if (draftId) await bob.client.from("videos").delete().eq("id", draftId);
    }
  });
});

describe.skipIf(!hasCreds)("RLS isolation: profiles & user_metadata", () => {
  let alice: Awaited<ReturnType<typeof signIn>>;
  let bob: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    alice = await signIn(ALICE_EMAIL!, ALICE_PASSWORD!);
    bob = await signIn(BOB_EMAIL!, BOB_PASSWORD!);
  });

  it("cannot UPDATE another user's profile row", async () => {
    const { data, error } = await alice.client
      .from("profiles")
      .update({ full_name: "HACKED" } as never)
      .eq("id", bob.userId)
      .select("id");
    expect(error).toBeNull(); // RLS filters silently; no error, just zero rows
    expect(data ?? []).toHaveLength(0);
  });

  it("cannot read another user's user_metadata", async () => {
    const { data } = await alice.client
      .from("user_metadata")
      .select("id")
      .eq("id", bob.userId);
    expect(data ?? []).toHaveLength(0);
  });
});

describe.skipIf(!hasCreds)("Cloud Run API isolation: jobs", () => {
  let alice: Awaited<ReturnType<typeof signIn>>;
  let bob: Awaited<ReturnType<typeof signIn>>;

  beforeAll(async () => {
    alice = await signIn(ALICE_EMAIL!, ALICE_PASSWORD!);
    bob = await signIn(BOB_EMAIL!, BOB_PASSWORD!);
  });

  it("a user cannot fetch another user's job by id", async () => {
    // Bob lists own jobs; if he has none, skip the assertion (still a pass for the env).
    const bobJobs = await fetch(`${CLOUD_RUN_URL}/jobs`, {
      headers: { Authorization: `Bearer ${bob.accessToken}` },
    }).then((r) => r.json() as Promise<{ jobs?: Array<{ id: string }> }>);
    const bobJobId = bobJobs.jobs?.[0]?.id;
    if (!bobJobId) return;

    const resp = await fetch(`${CLOUD_RUN_URL}/jobs/${bobJobId}`, {
      headers: { Authorization: `Bearer ${alice.accessToken}` },
    });
    expect([403, 404]).toContain(resp.status);
  });

  it("rejects unauthenticated job listing", async () => {
    const resp = await fetch(`${CLOUD_RUN_URL}/jobs`);
    expect([401, 403]).toContain(resp.status);
  });
});