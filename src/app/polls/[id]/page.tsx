import Link from "next/link";
import { getClient } from "@/lib/graphql/client";
import {
  POLL_DETAIL,
  TRANSCODER_STAKES,
  LATEST_ROUND,
  buildRoundStakeQuery,
  parseRoundStakeResults,
} from "@/lib/graphql/queries";
import { resolveProposal } from "@/lib/ipfs";
import { batchResolveEns } from "@/lib/ens";
import {
  computePollStatus,
  computePercentages,
  computeQuorum,
  formatStake,
  isPollActive,
} from "@/lib/utils";
import { LivepeerLogo } from "@/components/livepeer-logo";
import { StatusBadge } from "@/components/ui/badge";
import { VoteResultsBar } from "@/components/vote-results-bar";
import { PollTabs } from "@/components/poll-tabs";
import type {
  Poll,
  Transcoder,
  VoteWithStake,
} from "@/lib/graphql/types";

export const revalidate = 300;

async function getPollData(id: string) {
  const client = getClient();
  const [pollData, latestRoundData] = await Promise.all([
    client.request<{ poll: Poll | null }>(POLL_DETAIL, { id }),
    client.request<{
      rounds: Array<{ id: string; totalActiveStake: string }>;
    }>(LATEST_ROUND),
  ]);

  const poll = pollData.poll;
  const currentTotalActiveStake = parseFloat(
    latestRoundData.rounds[0].totalActiveStake
  );

  let totalActiveStake = currentTotalActiveStake;
  if (poll && !isPollActive(poll)) {
    try {
      const endBlock = parseInt(poll.endBlock);
      const query = buildRoundStakeQuery([endBlock]);
      const data = await client.request<
        Record<string, Array<{ id: string; totalActiveStake: string }>>
      >(query);
      const stakeMap = parseRoundStakeResults([endBlock], data);
      totalActiveStake = stakeMap.get(endBlock) ?? currentTotalActiveStake;
    } catch {
      // Fallback to current if round query fails
    }
  }

  return { poll, totalActiveStake };
}

async function getTranscoderStakes(addresses: string[]) {
  if (addresses.length === 0) return new Map<string, Transcoder>();
  const client = getClient();
  const data = await client.request<{ transcoders: Transcoder[] }>(
    TRANSCODER_STAKES,
    { ids: addresses.map((a) => a.toLowerCase()) }
  );
  const map = new Map<string, Transcoder>();
  for (const t of data.transcoders) {
    map.set(t.id.toLowerCase(), t);
  }
  return map;
}

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { poll, totalActiveStake } = await getPollData(id);

  if (!poll) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2 text-text-primary">
            Poll not found
          </h1>
          <Link
            href="/"
            className="text-[13px] text-lp-green hover:underline"
          >
            Back to all proposals
          </Link>
        </div>
      </div>
    );
  }

  const voterAddresses = poll.votes.map((v) => v.voter);

  const [metadata, transcoderStakes, ensNames] = await Promise.all([
    resolveProposal(poll.proposal),
    getTranscoderStakes(voterAddresses),
    batchResolveEns(voterAddresses),
  ]);

  const status = computePollStatus(poll, totalActiveStake);
  const { yesPercentage, noPercentage, totalVoteStake } =
    computePercentages(poll);
  const { quorumPercentage, quorumThreshold, quorumMet } = computeQuorum(
    poll,
    totalActiveStake
  );

  const votes: VoteWithStake[] = poll.votes.map((vote) => {
    const transcoder = transcoderStakes.get(vote.voter.toLowerCase());
    return {
      ...vote,
      transcoderTotalStake: transcoder?.totalStake ?? null,
      ensName: ensNames.get(vote.voter.toLowerCase()) ?? null,
    };
  });

  const title = metadata
    ? metadata.lip
      ? `LIP-${metadata.lip}: ${metadata.title}`
      : metadata.title
    : `Poll ${id.slice(0, 10)}...`;

  const quota = parseFloat(poll.quota) / 1_000_000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface-base/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <Link href="/" className="text-white hover:opacity-80 transition-opacity">
            <LivepeerLogo className="h-4 w-auto" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Title + Meta */}
        <div className="mb-6">
          <div className="mb-2">
            <StatusBadge status={status} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mb-2">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-text-tertiary">
            {metadata?.author && (
              <>
                <span className="text-text-secondary">{metadata.author}</span>
                <span className="text-border-hover px-1">·</span>
              </>
            )}
            <span className="text-vote-yes">
              {votes.filter((v) => v.choiceID === "Yes").length} Yes
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="text-vote-no">
              {votes.filter((v) => v.choiceID === "No").length} No
            </span>
            <span className="text-border-hover px-1">·</span>
            <span>{formatStake(totalVoteStake)} LPT participated</span>
          </div>
        </div>

        {/* Overview / Votes Tabs */}
        <PollTabs
          votes={votes}
          proposalBody={metadata?.body ?? null}
          resultsCard={
            <div className="rounded-lg border border-border-default bg-surface-card p-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-3">
                Results
              </div>
              <VoteResultsBar
                yesPercentage={yesPercentage}
                noPercentage={noPercentage}
                yesStake={poll.tally?.yes ?? "0"}
                noStake={poll.tally?.no ?? "0"}
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border-subtle bg-surface-raised p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
                    Quota ({(quota * 100).toFixed(0)}% required)
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-text-primary tabular-nums">
                      {yesPercentage.toFixed(1)}%
                    </span>
                    <span
                      className={`text-[11px] font-medium ${yesPercentage >= quota * 100 ? "text-vote-yes" : "text-vote-no"}`}
                    >
                      {yesPercentage >= quota * 100 ? "Met" : "Not Met"}
                    </span>
                  </div>
                </div>
                <div className="rounded-md border border-border-subtle bg-surface-raised p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1">
                    Quorum ({quorumThreshold.toFixed(1)}% required)
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-lg font-semibold text-text-primary tabular-nums">
                      {quorumPercentage.toFixed(1)}%
                    </span>
                    <span
                      className={`text-[11px] font-medium ${quorumMet ? "text-vote-yes" : "text-amber-400"}`}
                    >
                      {quorumMet ? "Met" : "Not Met"}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-surface-overlay">
                    <div
                      className="h-1 rounded-full bg-lp-green transition-all"
                      style={{
                        width: `${Math.min(100, (quorumPercentage / quorumThreshold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </main>
    </div>
  );
}
