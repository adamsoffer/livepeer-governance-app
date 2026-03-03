import type { Poll, PollStatus } from "./graphql/types";

export function formatStake(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Approximate current L1 block number
// Block 24500000 mined on Feb 20 2026 18:57:23 UTC
const REFERENCE_BLOCK = 24500000;
const REFERENCE_TIMESTAMP = 1771631843;
const SECONDS_PER_BLOCK = 12;

function estimateCurrentBlock(): number {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const elapsedSeconds = nowSeconds - REFERENCE_TIMESTAMP;
  return REFERENCE_BLOCK + Math.floor(elapsedSeconds / SECONDS_PER_BLOCK);
}

export function isPollActive(poll: Poll): boolean {
  const endBlock = parseInt(poll.endBlock);
  const currentBlock = estimateCurrentBlock();
  return currentBlock < endBlock;
}

export function estimateTimeRemaining(poll: Poll): string | null {
  const endBlock = parseInt(poll.endBlock);
  const currentBlock = estimateCurrentBlock();
  if (currentBlock >= endBlock) return null;

  const remainingSeconds = (endBlock - currentBlock) * SECONDS_PER_BLOCK;
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);

  if (days > 1) return `~${days} days`;
  if (days === 1) return `~1 day, ${hours}h`;
  if (hours > 0) return `~${hours}h ${minutes}m`;
  return `~${minutes}m`;
}

/**
 * Compute quorum percentage: what % of totalActiveStake participated.
 * The poll's quorum field (e.g. 333300) means 33.33% (parts per million)
 * is the minimum participation threshold.
 */
export function computeQuorum(
  poll: Poll,
  totalActiveStake: number
): { quorumPercentage: number; quorumThreshold: number; quorumMet: boolean } {
  const yesStake = parseFloat(poll.tally?.yes ?? "0");
  const noStake = parseFloat(poll.tally?.no ?? "0");
  const totalVoteStake = yesStake + noStake;

  // quorum is in parts per million (333300 = 33.33%)
  const quorumThreshold = parseFloat(poll.quorum) / 1_000_000;

  const quorumPercentage =
    totalActiveStake > 0 ? (totalVoteStake / totalActiveStake) * 100 : 0;

  const quorumMet = quorumPercentage >= quorumThreshold * 100;

  return { quorumPercentage, quorumThreshold: quorumThreshold * 100, quorumMet };
}

export function computePollStatus(
  poll: Poll,
  totalActiveStake: number
): PollStatus {
  if (isPollActive(poll)) {
    return "active";
  }

  const yesStake = parseFloat(poll.tally?.yes ?? "0");
  const noStake = parseFloat(poll.tally?.no ?? "0");
  const totalVoteStake = yesStake + noStake;
  const quota = parseFloat(poll.quota);

  // quota is parts per million (500000 = 50%)
  const quotaFraction = quota / 1_000_000;

  const { quorumMet } = computeQuorum(poll, totalActiveStake);
  const yesPercentage = totalVoteStake > 0 ? yesStake / totalVoteStake : 0;
  const quotaMet = yesPercentage >= quotaFraction;

  if (!quorumMet) return "quorum-not-met";
  if (quotaMet) return "passed";
  return "rejected";
}

export function getStatusColor(status: PollStatus): string {
  switch (status) {
    case "passed":
      return "bg-lp-green-subtle text-lp-green-bright border border-lp-green/20";
    case "rejected":
      return "bg-vote-no/10 text-vote-no border border-vote-no/20";
    case "quorum-not-met":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "active":
      return "bg-lp-blue-bright/10 text-lp-blue-bright border border-lp-blue-bright/20";
  }
}

export function getStatusLabel(status: PollStatus): string {
  switch (status) {
    case "passed":
      return "Passed";
    case "rejected":
      return "Rejected";
    case "quorum-not-met":
      return "Quorum Not Met";
    case "active":
      return "Active";
  }
}

export function computePercentages(poll: Poll): {
  yesPercentage: number;
  noPercentage: number;
  totalVoteStake: number;
} {
  const yesStake = parseFloat(poll.tally?.yes ?? "0");
  const noStake = parseFloat(poll.tally?.no ?? "0");
  const totalVoteStake = yesStake + noStake;

  return {
    yesPercentage: totalVoteStake > 0 ? (yesStake / totalVoteStake) * 100 : 0,
    noPercentage: totalVoteStake > 0 ? (noStake / totalVoteStake) * 100 : 0,
    totalVoteStake,
  };
}
