import { Suspense } from "react";
import Link from "next/link";
import { getClient } from "@/lib/graphql/client";
import {
  POLL_DETAIL,
  TRANSCODER_STAKES,
  DELEGATOR_DELEGATES,
  ALL_TRANSCODERS,
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
import { VoterTable } from "@/components/voter-table";
import { NonVoterTable } from "@/components/non-voter-table";
import type {
  Poll,
  Transcoder,
  VoteEvent,
  VoteWithStake,
  NonVoter,
} from "@/lib/graphql/types";

export const revalidate = 300;

async function getPollData(id: string) {
  const client = getClient();
  const [pollData, latestRoundData] = await Promise.all([
    client.request<{ poll: Poll | null; voteEvents: VoteEvent[] }>(POLL_DETAIL, {
      id,
    }),
    client.request<{
      rounds: Array<{ id: string; totalActiveStake: string }>;
    }>(LATEST_ROUND),
  ]);

  const poll = pollData.poll;

  // Merge timestamps from VoteEvents into Vote objects
  if (poll) {
    const timestampMap = new Map<string, number>();
    for (const event of pollData.voteEvents) {
      timestampMap.set(event.voter.toLowerCase(), event.timestamp);
    }
    for (const vote of poll.votes) {
      vote.timestamp = timestampMap.get(vote.voter.toLowerCase()) ?? null;
    }
  }
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

async function getDelegatorDelegates(addresses: string[]) {
  if (addresses.length === 0) return new Map<string, string>();
  const client = getClient();
  const data = await client.request<{
    delegators: Array<{ id: string; delegate: { id: string } | null }>;
  }>(DELEGATOR_DELEGATES, {
    ids: addresses.map((a) => a.toLowerCase()),
  });
  const map = new Map<string, string>();
  for (const d of data.delegators) {
    if (d.delegate) {
      map.set(d.id.toLowerCase(), d.delegate.id.toLowerCase());
    }
  }
  return map;
}

async function EnrichedVoterTable({ poll }: { poll: Poll }) {
  const voterAddresses = poll.votes.map((v) => v.voter);
  const delegatorAddresses = poll.votes
    .filter((v) => !v.registeredTranscoder)
    .map((v) => v.voter);

  const [transcoderStakes, ensProfiles, delegatorDelegates] = await Promise.all([
    getTranscoderStakes(voterAddresses),
    batchResolveEns(voterAddresses),
    getDelegatorDelegates(delegatorAddresses),
  ]);

  // Build a map of orchestrator -> delegator overrides
  const overridesByOrch = new Map<string, typeof poll.votes>();
  for (const vote of poll.votes) {
    if (vote.registeredTranscoder) continue;
    const delegate = delegatorDelegates.get(vote.voter.toLowerCase());
    if (delegate) {
      const existing = overridesByOrch.get(delegate) ?? [];
      existing.push(vote);
      overridesByOrch.set(delegate, existing);
    }
  }

  const votes: VoteWithStake[] = poll.votes.map((vote) => {
    const transcoder = transcoderStakes.get(vote.voter.toLowerCase());
    const overrides = overridesByOrch.get(vote.voter.toLowerCase()) ?? [];
    const profile = ensProfiles.get(vote.voter.toLowerCase());
    return {
      ...vote,
      transcoderTotalStake: transcoder?.totalStake ?? null,
      ensName: profile?.name ?? null,
      ensAvatar: profile?.avatar ?? null,
      delegatorOverrides: overrides.map((o) => {
        const oProfile = ensProfiles.get(o.voter.toLowerCase());
        return {
          voter: o.voter,
          ensName: oProfile?.name ?? null,
          ensAvatar: oProfile?.avatar ?? null,
          choiceID: o.choiceID,
          voteStake: o.voteStake,
          timestamp: o.timestamp,
        };
      }),
    };
  });

  return <VoterTable votes={votes} />;
}

async function EnrichedNonVoterTable({ poll }: { poll: Poll }) {
  const client = getClient();
  const allTranscodersData = await client.request<{
    transcoders: Transcoder[];
  }>(ALL_TRANSCODERS);

  const voterSet = new Set(
    poll.votes.map((v) => v.voter.toLowerCase())
  );
  const nonVoterTranscoders = allTranscodersData.transcoders.filter(
    (t) => !voterSet.has(t.id.toLowerCase())
  );

  const ensProfiles = await batchResolveEns(
    nonVoterTranscoders.map((t) => t.id)
  );

  const nonVoters: NonVoter[] = nonVoterTranscoders.map((t) => {
    const profile = ensProfiles.get(t.id.toLowerCase());
    return {
      address: t.id,
      totalStake: t.totalStake,
      ensName: profile?.name ?? null,
      ensAvatar: profile?.avatar ?? null,
    };
  });

  return <NonVoterTable nonVoters={nonVoters} />;
}

function VoterTableSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-64 rounded-md bg-surface-overlay animate-pulse" />
        <div className="h-4 w-16 rounded bg-surface-overlay animate-pulse" />
      </div>
      <div className="rounded-lg border border-border-default overflow-hidden">
        <div className="border-b border-border-default bg-surface-raised px-4 py-2.5">
          <div className="h-3 w-full rounded bg-surface-overlay animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-2.5 border-b border-border-subtle last:border-0"
          >
            <div className="h-4 w-32 rounded bg-surface-overlay animate-pulse" />
            <div className="h-4 w-20 rounded bg-surface-overlay animate-pulse" />
            <div className="h-4 w-12 rounded bg-surface-overlay animate-pulse" />
            <div className="h-4 w-24 rounded bg-surface-overlay animate-pulse ml-auto" />
            <div className="h-4 w-24 rounded bg-surface-overlay animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
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

  const client = getClient();
  const [metadata, allTranscodersData] = await Promise.all([
    resolveProposal(poll.proposal),
    client.request<{ transcoders: Transcoder[] }>(ALL_TRANSCODERS),
  ]);

  const voterSet = new Set(poll.votes.map((v) => v.voter.toLowerCase()));
  const nonVoterCount = allTranscodersData.transcoders.filter(
    (t) => !voterSet.has(t.id.toLowerCase())
  ).length;

  const status = computePollStatus(poll, totalActiveStake);
  const { yesPercentage, noPercentage, totalVoteStake } =
    computePercentages(poll);
  const { quorumPercentage, quorumThreshold, quorumMet } = computeQuorum(
    poll,
    totalActiveStake
  );

  const title = metadata
    ? metadata.lip
      ? `LIP-${metadata.lip}: ${metadata.title}`
      : metadata.title
    : `Poll ${id.slice(0, 10)}...`;

  const quota = parseFloat(poll.quota) / 1_000_000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface-base/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
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
              {poll.votes.filter((v) => v.choiceID === "Yes").length} Yes
            </span>
            <span className="text-text-tertiary">/</span>
            <span className="text-vote-no">
              {poll.votes.filter((v) => v.choiceID === "No").length} No
            </span>
            <span className="text-border-hover px-1">·</span>
            <span>{formatStake(totalVoteStake)} LPT participated</span>
          </div>
        </div>

        {/* Overview / Votes Tabs */}
        <PollTabs
          voterCount={poll.votes.length}
          nonVoterCount={nonVoterCount}
          proposalBody={metadata?.body ?? null}
          votesContent={
            <Suspense fallback={<VoterTableSkeleton />}>
              <EnrichedVoterTable poll={poll} />
            </Suspense>
          }
          nonVotersContent={
            <Suspense fallback={<VoterTableSkeleton />}>
              <EnrichedNonVoterTable poll={poll} />
            </Suspense>
          }
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
