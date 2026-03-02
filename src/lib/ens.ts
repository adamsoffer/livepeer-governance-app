export interface EnsProfile {
  name: string | null;
  avatar: string | null;
}

interface EnsDataEntry {
  ens_primary?: string;
  avatar?: string;
}

export async function resolveEnsProfile(
  address: string
): Promise<EnsProfile> {
  try {
    const res = await fetch(`https://api.ensdata.net/${address}`);
    if (!res.ok) return { name: null, avatar: null };

    const data = (await res.json()) as EnsDataEntry;
    return {
      name: data.ens_primary || null,
      avatar: data.avatar || null,
    };
  } catch {
    return { name: null, avatar: null };
  }
}
