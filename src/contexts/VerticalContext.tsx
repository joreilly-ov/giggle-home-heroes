import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, VerticalConfig, VerticalCategory } from "@/lib/api";

// Fallback ensures the UI is never blocked by the network call. Mirrors the
// car-vertical config returned by the backend's GET /api/vertical.
const FALLBACK: VerticalConfig = {
  app_title: "KisX Cars",
  owner_label: "vehicle owner",
  provider_label: "garage",
  categories: [
    { value: "bodywork", label: "Bodywork", icon: "🔧" },
    { value: "mechanical", label: "Mechanical", icon: "⚙️" },
    { value: "electrical", label: "Electrical", icon: "⚡" },
    { value: "tyres", label: "Tyres", icon: "🛞" },
    { value: "windscreen", label: "Windscreen", icon: "🪟" },
    { value: "interior", label: "Interior", icon: "💺" },
    { value: "general", label: "General", icon: "🚗" },
  ],
};

interface VerticalContextValue extends VerticalConfig {
  loading: boolean;
  error: string | null;
  /** Convenience: capitalised provider label, e.g. "Garage". */
  providerLabelTitle: string;
  /** Convenience: capitalised owner label, e.g. "Vehicle owner". */
  ownerLabelTitle: string;
  /** Look up a category by its `value`. */
  findCategory: (value: string) => VerticalCategory | undefined;
}

const VerticalContext = createContext<VerticalContextValue | null>(null);

const titleCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export function VerticalProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<VerticalConfig>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.vertical
      .get()
      .then((data) => {
        if (cancelled) return;
        setConfig({
          app_title: data.app_title ?? FALLBACK.app_title,
          owner_label: data.owner_label ?? FALLBACK.owner_label,
          provider_label: data.provider_label ?? FALLBACK.provider_label,
          categories:
            Array.isArray(data.categories) && data.categories.length > 0
              ? data.categories
              : FALLBACK.categories,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep fallback values; surface the error for any consumer that cares.
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: VerticalContextValue = {
    ...config,
    loading,
    error,
    providerLabelTitle: titleCase(config.provider_label),
    ownerLabelTitle: titleCase(config.owner_label),
    findCategory: (v: string) => config.categories.find((c) => c.value === v),
  };

  return (
    <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>
  );
}

export function useVertical(): VerticalContextValue {
  const ctx = useContext(VerticalContext);
  if (!ctx) {
    throw new Error("useVertical must be used within a <VerticalProvider>");
  }
  return ctx;
}