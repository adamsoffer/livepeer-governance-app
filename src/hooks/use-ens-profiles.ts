import { useState, useEffect, useMemo } from "react";

interface EnsProfile {
  name: string | null;
  avatar: string | null;
}

interface EnsDataEntry {
  ens_primary?: string;
  avatar?: string;
}

const BATCH_SIZE = 25;

/**
 * Client-side hook that resolves ENS profiles via ensdata.net bulk API.
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
    const controller = new AbortController();

    async function fetchBatch(batch: string[]) {
      const q = batch.join(",");
      const res = await fetch(`https://api.ensdata.net/bulk?q=${q}`, {
        signal: controller.signal,
      });
      if (!res.ok) return;

      const data = (await res.json()) as Record<string, EnsDataEntry>;

      if (controller.signal.aborted) return;

      setProfiles((prev) => {
        const next = new Map(prev);
        for (const [addr, entry] of Object.entries(data)) {
          next.set(addr.toLowerCase(), {
            name: entry.ens_primary || null,
            avatar: entry.avatar || null,
          });
        }
        return next;
      });
    }

    // Send all batches in parallel
    const batches: string[][] = [];
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      batches.push(unique.slice(i, i + BATCH_SIZE));
    }

    // Use allSettled so one failed batch doesn't block others
    Promise.allSettled(batches.map(fetchBatch));

    return () => {
      controller.abort();
    };
  }, [addressKey]);

  return profiles;
}
