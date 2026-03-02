import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({
  chain: mainnet,
  transport: http("https://cloudflare-eth.com", {
    timeout: 3000,
  }),
});

const ensCache = new Map<string, string | null>();

async function resolveWithTimeout(
  address: string,
  timeoutMs: number
): Promise<string | null> {
  const lower = address.toLowerCase();
  if (ensCache.has(lower)) {
    return ensCache.get(lower)!;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const name = await client.getEnsName({
      address: lower as `0x${string}`,
    });
    clearTimeout(timer);
    ensCache.set(lower, name);
    return name;
  } catch {
    ensCache.set(lower, null);
    return null;
  }
}

export async function resolveEnsName(
  address: string
): Promise<string | null> {
  return resolveWithTimeout(address, 3000);
}

export async function batchResolveEns(
  addresses: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const toResolve: string[] = [];

  for (const addr of addresses) {
    const lower = addr.toLowerCase();
    if (ensCache.has(lower)) {
      results.set(lower, ensCache.get(lower)!);
    } else {
      toResolve.push(lower);
    }
  }

  if (toResolve.length === 0) return results;

  // Resolve ALL in parallel with a global timeout of 3 seconds
  const allPromises = toResolve.map((addr) =>
    resolveWithTimeout(addr, 1500).then((name) => ({ addr, name }))
  );

  const settled = await Promise.race([
    Promise.allSettled(allPromises),
    new Promise<PromiseSettledResult<{ addr: string; name: string | null }>[]>(
      (resolve) =>
        setTimeout(() => {
          // Return what we have so far — anything not resolved gets null
          resolve(
            toResolve.map((addr) => ({
              status: "fulfilled" as const,
              value: { addr, name: ensCache.get(addr) ?? null },
            }))
          );
        }, 3000)
    ),
  ]);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.set(result.value.addr, result.value.name);
    } else {
      // This shouldn't happen with allSettled, but just in case
    }
  }

  // Fill in any missing with null
  for (const addr of toResolve) {
    if (!results.has(addr)) {
      results.set(addr, null);
    }
  }

  return results;
}
