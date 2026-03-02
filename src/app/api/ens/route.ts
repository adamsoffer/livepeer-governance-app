import { NextRequest, NextResponse } from "next/server";
import { batchResolveEns } from "@/lib/ens";

export async function POST(request: NextRequest) {
  const { addresses } = (await request.json()) as { addresses: string[] };

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json({ profiles: {} });
  }

  // Cap at 50 addresses per request to avoid abuse
  const capped = addresses.slice(0, 50);
  const profileMap = await batchResolveEns(capped);

  const profiles: Record<string, { name: string | null; avatar: string | null }> = {};
  for (const [addr, profile] of profileMap) {
    profiles[addr] = profile;
  }

  return NextResponse.json({ profiles });
}
