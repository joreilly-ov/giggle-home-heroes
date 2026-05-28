/**
 * Unit tests for scripts/db-seed.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { signIn, getOrCreateContractor, runSeed } from "../../scripts/db-seed";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignInWithPassword = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
    from: mockFrom,
  }),
}));

beforeEach(() => vi.clearAllMocks());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockSignIn(userId: string) {
  mockSignInWithPassword.mockResolvedValue({
    data: { session: { user: { id: userId }, access_token: "tok" } },
    error: null,
  });
}

function mockSignInFail(message: string) {
  mockSignInWithPassword.mockResolvedValue({
    data: { session: null },
    error: { message },
  });
}

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  it("returns the user ID on success", async () => {
    const fakeSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "user-123" }, access_token: "tok" } },
          error: null,
        }),
      },
    };
    // @ts-expect-error — passing minimal stub
    const id = await signIn(fakeSupabase, "owner@test.com", "pass");
    expect(id).toBe("user-123");
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

// ─── getContractorId ──────────────────────────────────────────────────────────

describe("getOrCreateContractor", () => {
  it("returns the id when a contractor row already exists", async () => {
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { id: "contractor-abc" }, error: null }),
          }),
        }),
      }),
    };
    // @ts-expect-error — passing minimal stub
    const id = await getOrCreateContractor(fakeSupabase, "user-123");
    expect(id).toBe("contractor-abc");
  });

  it("creates a contractor row and returns its id when none exists", async () => {
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: "new-contractor-id" }, error: null }),
          }),
        }),
      }),
    };
    // @ts-expect-error — passing minimal stub
    const id = await getOrCreateContractor(fakeSupabase, "user-xyz");
    expect(id).toBe("new-contractor-id");
  });

  it("throws on lookup error", async () => {
    const fakeSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { message: "DB error" } }),
          }),
        }),
      }),
    };
    // @ts-expect-error — passing minimal stub
    await expect(getOrCreateContractor(fakeSupabase, "user-xyz")).rejects.toThrow("DB error");
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
    // garage sign-in, then owner sign-in
    mockSignInWithPassword
      .mockResolvedValueOnce({
        data: { session: { user: { id: "garage-user-1" }, access_token: "g-tok" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { session: { user: { id: "owner-user-1" }, access_token: "o-tok" } },
        error: null,
      });

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: "contractor-99" }, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
    });
  }

  it("returns a SeedResult with the contractor id and ratings", async () => {
    setupHappyPath();
    const result = await runSeed(config);
    expect(result.contractorId).toBe("contractor-99");
    expect(result.ratingQuality).toBeGreaterThanOrEqual(3);
    expect(result.ratingCommunication).toBeGreaterThanOrEqual(3);
    expect(result.ratingCleanliness).toBeGreaterThanOrEqual(3);
  });

  it("signs in as garage first, then owner", async () => {
    setupHappyPath();
    await runSeed(config);
    expect(mockSignInWithPassword).toHaveBeenNthCalledWith(1, {
      email: config.garageEmail,
      password: config.garagePassword,
    });
    expect(mockSignInWithPassword).toHaveBeenNthCalledWith(2, {
      email: config.ownerEmail,
      password: config.ownerPassword,
    });
  });

  it("throws if garage sign-in fails", async () => {
    mockSignInFail("Invalid credentials");
    await expect(runSeed(config)).rejects.toThrow("Invalid credentials");
  });

  it("throws if contractor row is missing", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "u1" }, access_token: "tok" } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: { message: "No rows found" } }),
        }),
      }),
    });
    await expect(runSeed(config)).rejects.toThrow("No rows found");
  });

  it("throws if the review insert fails", async () => {
    mockSignInWithPassword
      .mockResolvedValueOnce({
        data: { session: { user: { id: "g1" }, access_token: "tok" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { session: { user: { id: "o1" }, access_token: "tok" } },
        error: null,
      });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: "c1" }, error: null }),
        }),
      }),
      insert: () => Promise.resolve({ error: { message: "RLS policy violation" } }),
    });
    await expect(runSeed(config)).rejects.toThrow("RLS policy violation");
  });
});
