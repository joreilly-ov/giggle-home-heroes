/**
 * Unit tests for scripts/db-seed.ts
 *
 * Exercises the exported helper functions (signIn, cloudRunRequest) and
 * verifies that runSeed drives the expected API call sequence, all without
 * hitting the real network.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CLOUD_RUN_BASE, signIn, cloudRunRequest, runSeed } from "../../scripts/db-seed";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignInWithPassword = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function errorResponse(body: string, status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(body),
  });
}

function mockSupabaseSignIn(token: string | null, errorMessage?: string) {
  mockSignInWithPassword.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
    error: errorMessage ? { message: errorMessage } : null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  it("returns the access token on success", async () => {
    const fakeSupabase = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: { access_token: "tok-abc" } },
        error: null,
      })},
    };

    // @ts-expect-error — passing minimal stub
    const token = await signIn(fakeSupabase, "owner@test.com", "pass");
    expect(token).toBe("tok-abc");
  });

  it("throws when Supabase returns an error", async () => {
    const fakeSupabase = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      })},
    };

    // @ts-expect-error — passing minimal stub
    await expect(signIn(fakeSupabase, "bad@test.com", "wrong")).rejects.toThrow(
      "Invalid login credentials"
    );
  });

  it("throws when session is null even without an explicit error", async () => {
    const fakeSupabase = {
      auth: { signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      })},
    };

    // @ts-expect-error — passing minimal stub
    await expect(signIn(fakeSupabase, "x@test.com", "y")).rejects.toThrow("no session");
  });
});

// ─── cloudRunRequest ──────────────────────────────────────────────────────────

describe("cloudRunRequest", () => {
  it("calls the correct full URL", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: "job-1" }));

    await cloudRunRequest("/jobs", "token-x");

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(`${CLOUD_RUN_BASE}/jobs`);
  });

  it("sends Authorization header with the token", async () => {
    mockFetch.mockReturnValue(jsonResponse({}));

    await cloudRunRequest("/jobs", "my-jwt");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-jwt");
  });

  it("always sets Content-Type to application/json", async () => {
    mockFetch.mockReturnValue(jsonResponse({}));

    await cloudRunRequest("/jobs", "tok");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("serialises and forwards the request body", async () => {
    mockFetch.mockReturnValue(jsonResponse({ id: "bid-1" }));

    await cloudRunRequest("/jobs/j1/bids", "tok", {
      method: "POST",
      body: JSON.stringify({ amount_pence: 25000, note: "test" }),
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ amount_pence: 25000, note: "test" });
  });

  it("throws with response body text when the request fails", async () => {
    mockFetch.mockReturnValue(errorResponse("job not found", 404));

    await expect(cloudRunRequest("/jobs/missing", "tok")).rejects.toThrow(
      "/jobs/missing → 404: job not found"
    );
  });

  it("throws with fallback message when error body is empty", async () => {
    mockFetch.mockReturnValue(errorResponse("", 503));

    await expect(cloudRunRequest("/jobs", "tok")).rejects.toThrow(
      "/jobs → 503: request failed"
    );
  });

  it("returns undefined for 204 No Content responses", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({ ok: true, status: 204, json: vi.fn(), text: vi.fn() })
    );

    const result = await cloudRunRequest("/jobs/j1/bids/b1", "tok", { method: "DELETE" });
    expect(result).toBeUndefined();
  });
});

// ─── runSeed ──────────────────────────────────────────────────────────────────

describe("runSeed", () => {
  const config = {
    ownerEmail: "owner@test.com",
    ownerPassword: "ownerpass",
    garageEmail: "garage@test.com",
    garagePassword: "garagepass",
  };

  function setupHappyPath() {
    // signIn calls (owner then garage)
    mockSignInWithPassword
      .mockResolvedValueOnce({ data: { session: { access_token: "owner-tok" } }, error: null })
      .mockResolvedValueOnce({ data: { session: { access_token: "garage-tok" } }, error: null });

    mockFetch
      // POST /jobs — create job
      .mockReturnValueOnce(jsonResponse({ id: "job-99", status: "draft" }))
      // PATCH /jobs/job-99 — publish
      .mockReturnValueOnce(jsonResponse({ id: "job-99", status: "open" }))
      // POST /jobs/job-99/bids — submit bid
      .mockReturnValueOnce(jsonResponse({ id: "bid-55" }))
      // PATCH /jobs/job-99/bids/bid-55 — accept bid
      .mockReturnValueOnce(jsonResponse({ id: "bid-55", status: "accepted" }))
      // POST /jobs/job-99/milestones — create milestones
      .mockReturnValueOnce(
        jsonResponse([
          { id: "ms-1", title: "Assessment & parts order" },
          { id: "ms-2", title: "Repair work" },
          { id: "ms-3", title: "Quality check & handover" },
        ])
      )
      // POST /jobs/job-99/milestones/ms-1/photos — submit photo
      .mockReturnValueOnce(jsonResponse({ id: "photo-1" }))
      // PATCH /jobs/job-99/milestones/ms-1 — approve
      .mockReturnValueOnce(jsonResponse({ id: "ms-1", status: "approved" }));
  }

  it("returns a SeedResult with the job ID and milestone count", async () => {
    setupHappyPath();

    const result = await runSeed(config);

    expect(result.jobId).toBe("job-99");
    expect(result.milestonesCreated).toBe(3);
    expect(result.bidAmountPence).toBeGreaterThan(0);
  });

  it("signs in the owner before the garage", async () => {
    setupHappyPath();

    await runSeed(config);

    expect(mockSignInWithPassword).toHaveBeenNthCalledWith(1, {
      email: config.ownerEmail,
      password: config.ownerPassword,
    });
    expect(mockSignInWithPassword).toHaveBeenNthCalledWith(2, {
      email: config.garageEmail,
      password: config.garagePassword,
    });
  });

  it("calls all 7 expected Cloud Run endpoints in order", async () => {
    setupHappyPath();

    await runSeed(config);

    const urls = mockFetch.mock.calls.map(([url]: [string]) =>
      url.replace(CLOUD_RUN_BASE, "")
    );

    expect(urls[0]).toBe("/jobs");                               // create job
    expect(urls[1]).toBe("/jobs/job-99");                        // publish
    expect(urls[2]).toBe("/jobs/job-99/bids");                   // submit bid
    expect(urls[3]).toBe("/jobs/job-99/bids/bid-55");            // accept bid
    expect(urls[4]).toBe("/jobs/job-99/milestones");             // create milestones
    expect(urls[5]).toBe("/jobs/job-99/milestones/ms-1/photos"); // photo
    expect(urls[6]).toBe("/jobs/job-99/milestones/ms-1");        // approve
    expect(urls).toHaveLength(7);
  });

  it("uses the owner token for owner actions and garage token for garage actions", async () => {
    setupHappyPath();

    await runSeed(config);

    const authHeaders = mockFetch.mock.calls.map(
      ([, init]: [string, RequestInit]) =>
        (init.headers as Record<string, string>)["Authorization"]
    );

    expect(authHeaders[0]).toBe("Bearer owner-tok"); // create job
    expect(authHeaders[1]).toBe("Bearer owner-tok"); // publish
    expect(authHeaders[2]).toBe("Bearer garage-tok"); // submit bid
    expect(authHeaders[3]).toBe("Bearer owner-tok"); // accept bid
    expect(authHeaders[4]).toBe("Bearer garage-tok"); // create milestones
    expect(authHeaders[5]).toBe("Bearer garage-tok"); // photo
    expect(authHeaders[6]).toBe("Bearer owner-tok"); // approve milestone
  });

  it("embeds seed_run timestamp in the job analysis_result", async () => {
    setupHappyPath();

    await runSeed(config);

    const [, createInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(createInit.body as string);
    expect(body.analysis_result.seed_run).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("throws if sign-in fails for the owner", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid credentials" },
    });

    await expect(runSeed(config)).rejects.toThrow("Invalid credentials");
  });
});
