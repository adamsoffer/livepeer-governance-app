import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

const rpcUrl = process.env.ETHEREUM_RPC_URL || "https://cloudflare-eth.com";

const client = createPublicClient({
  chain: mainnet,
  transport: http(rpcUrl, {
    timeout: 10_000,
    batch: true,
  }),
});

export interface EnsProfile {
  name: string | null;
  avatar: string | null;
}

const ensCache = new Map<string, string | null>();
const avatarCache = new Map<string, string | null>();

const CHUNK_SIZE = 50;
const PER_RESOLVE_TIMEOUT = 5000;

async function resolveNameSafe(address: string): Promise<string | null> {
  const lower = address.toLowerCase();
  if (ensCache.has(lower)) {
    return ensCache.get(lower)!;
  }

  try {
    const result = await Promise.race([
      client.getEnsName({ address: lower as `0x${string}` }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PER_RESOLVE_TIMEOUT)
      ),
    ]);
    ensCache.set(lower, result);
    return result;
  } catch {
    ensCache.set(lower, null);
    return null;
  }
}

async function resolveAvatarSafe(ensName: string): Promise<string | null> {
  const key = ensName.toLowerCase();
  if (avatarCache.has(key)) {
    return avatarCache.get(key)!;
  }

  try {
    const result = await Promise.race([
      client.getEnsAvatar({ name: normalize(ensName) }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PER_RESOLVE_TIMEOUT)
      ),
    ]);
    avatarCache.set(key, result);
    return result;
  } catch {
    avatarCache.set(key, null);
    return null;
  }
}

/** Process items in chunks to avoid rate limiting */
async function processInChunks<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  chunkSize: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function resolveEnsProfile(
  address: string
): Promise<EnsProfile> {
  const name = await resolveNameSafe(address);
  const avatar = name ? await resolveAvatarSafe(name) : null;
  return { name, avatar };
}

export async function batchResolveEns(
  addresses: string[]
): Promise<Map<string, EnsProfile>> {
  const results = new Map<string, EnsProfile>();

  // Separate cached from uncached
  const toResolveName: string[] = [];
  for (const addr of addresses) {
    const lower = addr.toLowerCase();
    if (ensCache.has(lower)) {
      const name = ensCache.get(lower)!;
      results.set(lower, {
        name,
        avatar: name ? (avatarCache.get(name.toLowerCase()) ?? null) : null,
      });
    } else {
      toResolveName.push(lower);
    }
  }

  // Resolve names in chunks to avoid rate limiting
  if (toResolveName.length > 0) {
    const nameResults = await processInChunks(
      toResolveName,
      async (addr) => {
        const name = await resolveNameSafe(addr);
        return { addr, name };
      },
      CHUNK_SIZE
    );

    for (const { addr, name } of nameResults) {
      results.set(addr, { name, avatar: null });
    }
  }

  // Collect addresses that have ENS names but need avatar resolution
  const avatarEntries: { addr: string; ensName: string }[] = [];
  for (const [addr, profile] of results) {
    if (profile.name && !avatarCache.has(profile.name.toLowerCase())) {
      avatarEntries.push({ addr, ensName: profile.name });
    }
  }

  // Resolve avatars in chunks
  if (avatarEntries.length > 0) {
    const avatarResults = await processInChunks(
      avatarEntries,
      async ({ addr, ensName }) => {
        const avatar = await resolveAvatarSafe(ensName);
        return { addr, avatar };
      },
      CHUNK_SIZE
    );

    for (const { addr, avatar } of avatarResults) {
      const existing = results.get(addr);
      if (existing) {
        existing.avatar = avatar;
      }
    }
  }

  // Fill in cached avatars for entries that already had names cached
  for (const [, profile] of results) {
    if (profile.name && profile.avatar === null) {
      profile.avatar =
        avatarCache.get(profile.name.toLowerCase()) ?? null;
    }
  }

  return results;
}
