import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Server-side admin check via user_roles table (RLS-protected).
 * Never trust client-side storage for role gating.
 */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    (supabase.rpc as any)("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }: { data: boolean | null; error: unknown }) => {
        if (cancelled) return;
        setIsAdmin(!error && data === true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, loading };
}
