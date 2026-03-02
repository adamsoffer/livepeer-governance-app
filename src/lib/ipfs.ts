import matter from "gray-matter";
import { IPFS_GATEWAYS, IPFS_TIMEOUT_MS } from "./constants";
import type { ProposalMetadata } from "./graphql/types";

const cache = new Map<string, ProposalMetadata | null>();

function toCid(proposal: string): string {
  // Proposal field is already a CID string like "QmXyz..."
  if (proposal.startsWith("Qm") || proposal.startsWith("bafy")) {
    return proposal;
  }
  // If hex-encoded, decode to UTF-8
  if (proposal.startsWith("0x")) {
    try {
      const bytes = Buffer.from(proposal.slice(2), "hex");
      return bytes.toString("utf8").trim().replace(/\0/g, "");
    } catch {
      // fall through
    }
  }
  return proposal;
}

async function fetchFromGateway(
  cid: string,
  gateway: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IPFS_TIMEOUT_MS);
    const res = await fetch(`${gateway}/${cid}`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseMarkdown(text: string, cid: string): ProposalMetadata {
  try {
    const { data, content: body } = matter(text);
    return {
      lip: data.lip ?? null,
      title: data.title ?? `Proposal ${cid.slice(0, 8)}...`,
      author: data.author,
      status: data.status,
      created: data.created,
      discussionsTo: data["discussions-to"],
      body: body.trim(),
    };
  } catch {
    return {
      lip: null,
      title: `Proposal ${cid.slice(0, 8)}...`,
      body: text.trim(),
    };
  }
}

export async function resolveProposal(
  proposalHash: string
): Promise<ProposalMetadata | null> {
  if (cache.has(proposalHash)) {
    return cache.get(proposalHash)!;
  }

  const cid = toCid(proposalHash);

  for (const gateway of IPFS_GATEWAYS) {
    const content = await fetchFromGateway(cid, gateway);
    if (content) {
      // The IPFS content can be either:
      // 1. JSON with { text: "---\nfrontmatter\n---\nbody", gitCommitHash: "..." }
      // 2. Raw markdown with frontmatter
      let markdown = content;
      try {
        const json = JSON.parse(content);
        if (json.text) {
          markdown = json.text;
        }
      } catch {
        // Not JSON, use raw content as markdown
      }

      const metadata = parseMarkdown(markdown, cid);
      cache.set(proposalHash, metadata);
      return metadata;
    }
  }

  cache.set(proposalHash, null);
  return null;
}
