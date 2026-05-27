/**
 * Unit tests for scripts/db-seed.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CLOUD_RUN_BASE,
  PLACEHOLDER_IMAGE,
  signIn,
  cloudRunRequest,
  runSeed,
} from "../../scripts/db-seed";

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

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  it("returns the access token on success", async () => {
    const fakeSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: { access_token: "tok-abc" } },
          error: null,
        }),
      },
    };
    // @ts-expect-error — passing minimal stub
    const token = await signIn(fakeSupabase, "owner@test.com", "pass");
    expect(token).toBe("tok-abc");
  });

  it("throws when Supabase returns an error", async () => {
    const fakeSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { message: "Invalid login credentials" },
        }),
      },
    };
    // @ts-expect-error — passing minimal stub
    await expect(signIn(fakeSupabase, "bad@test.com", "wrong")).rejects.toThrow(
      "Invalid login credentials"
    );
  });

  it("throws when session is null with no explicit error", async () => {
    const fakeSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    };
    // @ts-expect-error — passing minimal stub
    await expect(signIn(fakeSupabase, "x@test.com", "y")).rejects.toThrow("no session");
  });
});

// ─── cloudRunRequest ──────────────────────────────────────────────────────────

describe("cloudRunRequest", () => {
  it("calls the correct full URL", async () => {
    mockFetch.mockReturnValue(jsonResponse({ likely_issue: "tyre wear" }));
    await cloudRunRequest("/analyse/photos", "token-x");
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe(`${CLOUD_RUN_BASE}/analyse/photos`);
  });

  it("sends Authorization header with the token", async () => {
    mockFetch.mockReturnValue(jsonResponse({}));
    await cloudRunRequest("/analyse/photos", "my-jwt");
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-jwt");
  });

  it("throws with response body text on failure", async () => {
    mockFetch.mockReturnValue(errorResponse("unauthorised", 401));
    await expect(cloudRunRequest("/analyse/photos", "tok")).rejects.toThrow(
      "/analyse/photos → 401: unauthorised"
    );
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({ ok: true, status: 204, json: vi.fn(), text: vi.fn() })
    );
    const result = await cloudRunRequest("/some/path", "tok", { method: "DELETE" });
    expect(result).toBeUndefined();
  });
});

// ─── runSeed ──────────────────────────────────────────────────────────────────

describe("runSeed", () => {
  const config = { ownerEmail: "owner@test.com", ownerPassword: "ownerpass" };

  const fakeAnalysis = {
    likely_issue: "Tyre tread depth below legal minimum",
    urgency_score: 8,
    required_tools: ["tyre iron", "jack"],
    estimated_parts: ["2x front tyres"],
  };

  function setupHappyPath() {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: "owner-tok" } },
      error: null,
    });
    mockFetch.mockReturnValueOnce(jsonResponse(fakeAnalysis));
  }

  it("returns a SeedResult with vehicle, category and analysis data", async () => {
    setupHappyPath();
    const result = await runSeed(config);
    expect(result.vehicle).toBeTruthy();
    expect(result.category).toBeTruthy();
    expect(result.likelyIssue).toBe(fakeAnalysis.likely_issue);
    expect(result.urgencyScore).toBe(fakeAnalysis.urgency_score);
  });

  it("calls only one Cloud Run endpoint: POST /analyse/photos", async () => {
    setupHappyPath();
    await runSeed(config);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CLOUD_RUN_BASE}/analyse/photos`);
    expect(init.method).toBe("POST");
  });

  it("sends owner token in the Authorization header", async () => {
    setupHappyPath();
    await runSeed(config);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer owner-tok");
  });

  it("includes images, description and trade_category in the request body", async () => {
    setupHappyPath();
    await runSeed(config);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(Array.isArray(body.images)).toBe(true);
    expect(body.images[0]).toBe(PLACEHOLDER_IMAGE);
    expect(typeof body.description).toBe("string");
    expect(body.description.length).toBeGreaterThan(10);
    expect(typeof body.trade_category).toBe("string");
  });

  it("throws if sign-in fails", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid credentials" },
    });
    await expect(runSeed(config)).rejects.toThrow("Invalid credentials");
  });
});
