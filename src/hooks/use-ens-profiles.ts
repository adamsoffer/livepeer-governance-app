import { useState, useEffect, useMemo } from "react";

interface EnsProfile {
  name: string | null;
  avatar: string | null;
}

const BATCH_SIZE = 50;

/**
 * Client-side hook that progressively resolves ENS profiles for a list of addresses.
 * Returns a map of lowercase address -> EnsProfile that updates as batches resolve.
 */
export function useEnsProfiles(addresses: string[]) {
  const [profiles, setProfiles] = useState<Map<string, EnsProfile>>(new Map());

  // Create a stable key so the effect only re-runs when the address set changes
  const addressKey = useMemo(() => {
    if (addresses.length === 0) return "";
    return [...new Set(addresses.map((a) => a.toLowerCase()))]
      .sort()
      .join(",");
  }, [addresses]);

  useEffect(() => {
    if (!addressKey) return;

    const unique = addressKey.split(",");
    let cancelled = false;

    async function fetchBatches() {
      for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = unique.slice(i, i + BATCH_SIZE);

        try {
          const res = await fetch("/api/ens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ addresses: batch }),
          });
          if (!res.ok) continue;

          const data = (await res.json()) as {
            profiles: Record<string, EnsProfile>;
          };

          if (cancelled) return;

          setProfiles((prev) => {
            const next = new Map(prev);
            for (const [addr, profile] of Object.entries(data.profiles)) {
              next.set(addr.toLowerCase(), profile);
            }
            return next;
          });
        } catch {
          // Continue with next batch on error
        }
      }
    }

    fetchBatches();

    return () => {
      cancelled = true;
    };
  }, [addressKey]);

  return profiles;
}
