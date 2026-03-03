import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { VoteResultsBar } from "@/components/vote-results-bar";
import { formatStake, estimateTimeRemaining } from "@/lib/utils";
import type { Poll, PollStatus, ProposalMetadata } from "@/lib/graphql/types";

export function PollCard({
  id,
  metadata,
  status,
  yesPercentage,
  noPercentage,
  yesStake,
  noStake,
  totalVoteStake,
  voterCount,
  quorumPercentage,
  quorumMet,
  yesVoters,
  noVoters,
  poll,
}: {
  id: string;
  metadata: ProposalMetadata | null;
  status: PollStatus;
  yesPercentage: number;
  noPercentage: number;
  yesStake: string;
  noStake: string;
  totalVoteStake: number;
  voterCount: number;
  quorumPercentage: number;
  quorumMet: boolean;
  yesVoters: number;
  noVoters: number;
  poll: Poll;
}) {
  const title = metadata
    ? metadata.lip
      ? `LIP-${metadata.lip}: ${metadata.title}`
      : metadata.title
    : `Poll ${id.slice(0, 10)}...`;

  return (
    <Link
      href={`/polls/${id}`}
      className="group block rounded-lg border border-border-default bg-surface-card p-5 transition-all hover:bg-surface-overlay hover:border-border-hover"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="text-[15px] font-medium text-text-primary group-hover:text-white transition-colors line-clamp-1">
          {title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {status === "active" && (
            <span className="text-[11px] text-text-tertiary whitespace-nowrap">
              Ends in {estimateTimeRemaining(poll)}
            </span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      <VoteResultsBar
        yesPercentage={yesPercentage}
        noPercentage={noPercentage}
        yesStake={yesStake}
        noStake={noStake}
      />

      <div className="mt-3 flex items-center justify-between text-[12px] text-text-tertiary">
        <div className="flex items-center gap-2 min-w-0">
          <span className="whitespace-nowrap">
            <span className="text-vote-yes">{yesVoters} Yes</span>
            {" / "}
            <span className="text-vote-no">{noVoters} No</span>
          </span>
          <span className="text-border-hover">·</span>
          <span className="whitespace-nowrap">
            {formatStake(totalVoteStake)} LPT
          </span>
          <span className="text-border-hover">·</span>
          <span className="whitespace-nowrap">
            Quorum{" "}
            <span className={quorumMet ? "text-vote-yes" : "text-amber-400"}>
              {quorumPercentage.toFixed(1)}%
            </span>
            <span className="text-text-tertiary">/33.3%</span>
          </span>
        </div>
        {metadata?.author && (
          <span className="truncate max-w-[160px] ml-3 shrink-0">
            {metadata.author}
          </span>
        )}
      </div>
    </Link>
  );
}
