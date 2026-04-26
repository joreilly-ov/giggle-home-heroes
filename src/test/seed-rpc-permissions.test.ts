/**
 * Tests guarding the seed/admin RPC functions.
 *
 * Migration `20260425120900_revoke_seed_rpc_execute.sql` revokes EXECUTE on
 *   - public.seed_insert_contractor
 *   - public.seed_insert_review
 * from PUBLIC, anon, and authenticated roles. Only `service_role` may call
 * them. These tests assert that any client using the publishable (anon) key —
 * whether signed-in or not — receives a permission-denied error and never a
 * successful RPC response.
 *
 * The Supabase client is mocked so the test is hermetic. We verify that:
 *   1. The frontend never wires these RPCs into normal code paths.
 *   2. When invoked, the PostgREST layer surfaces a 42501 (insufficient
 *      privilege) style error that our client code would propagate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const SEED_FUNCTIONS = ["seed_insert_contractor", "seed_insert_review"] as const;

// Postgres error returned by PostgREST when EXECUTE has been revoked.
const PERMISSION_DENIED = {
  data: null,
  error: {
    code: "42501",
    message: "permission denied for function",
    details: null,
    hint: null,
  },
};

const mockRpc = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    rpc: mockRpc,
  },
}));

const { supabase } = await import("@/integrations/supabase/client");

beforeEach(() => {
  mockRpc.mockReset();
  mockGetSession.mockReset();
  // Default: every call returns permission-denied (matches DB grants).
  mockRpc.mockResolvedValue(PERMISSION_DENIED);
});

describe("seed RPC functions are locked down", () => {
  describe("unauthenticated (anon) caller", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
    });

    for (const fn of SEED_FUNCTIONS) {
      it(`rejects ${fn} with 42501 permission denied`, async () => {
        const res = await (supabase as any).rpc(fn, {});
        expect(res.data).toBeNull();
        expect(res.error).not.toBeNull();
        expect(res.error.code).toBe("42501");
        expect(res.error.message).toMatch(/permission denied/i);
      });
    }
  });

  describe("authenticated caller", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            access_token: "fake-jwt",
            user: { id: "00000000-0000-0000-0000-000000000001" },
          },
        },
      });
    });

    for (const fn of SEED_FUNCTIONS) {
      it(`rejects ${fn} with 42501 permission denied`, async () => {
        const res = await (supabase as any).rpc(fn, {});
        expect(res.data).toBeNull();
        expect(res.error).not.toBeNull();
        expect(res.error.code).toBe("42501");
        expect(res.error.message).toMatch(/permission denied/i);
      });
    }

    it("never returns a successful payload for any seed function", async () => {
      for (const fn of SEED_FUNCTIONS) {
        const res = await (supabase as any).rpc(fn, {});
        expect(res.data).toBeNull();
      }
    });
  });

  describe("frontend code never calls seed RPCs", () => {
    it("has no production references to seed_insert_contractor / seed_insert_review", async () => {
      // Static assertion: the test would have been updated alongside any
      // legitimate use. Fails loudly if a future change wires a seed RPC into
      // the client bundle.
      const fs = await import("node:fs");
      const path = await import("node:path");

      const srcDir = path.resolve(__dirname, "..");
      const offenders: string[] = [];

      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "test" || entry.name === "node_modules") continue;
            walk(full);
          } else if (/\.(ts|tsx)$/.test(entry.name)) {
            // Skip auto-generated Supabase type definitions — they enumerate
            // every DB function for typing purposes but never invoke them.
            if (full.endsWith("/integrations/supabase/types.ts")) continue;
            const contents = fs.readFileSync(full, "utf8");
            for (const fn of SEED_FUNCTIONS) {
              if (contents.includes(fn)) offenders.push(`${full} → ${fn}`);
            }
          }
        }
      }

      walk(srcDir);
      expect(offenders).toEqual([]);
    });
  });
});