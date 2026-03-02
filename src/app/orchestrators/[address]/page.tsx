import Link from "next/link";
import { AddressAvatar } from "@/components/ui/address-avatar";
import { getClient } from "@/lib/graphql/client";
import {
  VOTES_BY_VOTER,
  TRANSCODER_STAKES,
  LATEST_ROUND,
  buildRoundStakeQuery,
  parseRoundStakeResults,
} from "@/lib/graphql/queries";
import { resolveProposal } from "@/lib/ipfs";
import { resolveEnsProfile } from "@/lib/ens";
import {
  computePollStatus,
  formatStake,
  truncateAddress,
  isPollActive,
} from "@/lib/utils";
import { LivepeerLogo } from "@/components/livepeer-logo";
import { StatusBadge } from "@/components/ui/badge";
import type { Poll, Transcoder, Vote } from "@/lib/graphql/types";

export const revalidate = 300;

interface VoteWithPoll extends Vote {
  poll: Poll;
}

async function getVotesForVoter(voter: string) {
  const client = getClient();
  const data = await client.request<{ votes: VoteWithPoll[] }>(
    VOTES_BY_VOTER,
    { voter: voter.toLowerCase() }
  );
  return data.votes;
}

async function getTranscoder(address: string) {
  const client = getClient();
  const data = await client.request<{ transcoders: Transcoder[] }>(
    TRANSCODER_STAKES,
    { ids: [address.toLowerCase()] }
  );
  return data.transcoders[0] ?? null;
}

export default async function OrchestratorPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  const client = getClient();
  const [votes, transcoder, ensProfile, latestRoundData] = await Promise.all([
    getVotesForVoter(address),
    getTranscoder(address),
    resolveEnsProfile(address),
    client.request<{
      rounds: Array<{ id: string; totalActiveStake: string }>;
    }>(LATEST_ROUND),
  ]);
  const ensName = ensProfile.name;
  const ensAvatar = ensProfile.avatar;
  const currentTotalActiveStake = parseFloat(
    latestRoundData.rounds[0].totalActiveStake
  );

  const sortedVotes = [...votes].sort(
    (a, b) => parseInt(b.poll.endBlock) - parseInt(a.poll.endBlock)
  );

  // Fetch per-round totalActiveStake for each poll
  const endBlocks = sortedVotes.map((v) => parseInt(v.poll.endBlock));
  let stakeByBlock = new Map<number, number>();
  if (endBlocks.length > 0) {
    try {
      const query = buildRoundStakeQuery(endBlocks);
      const data = await client.request<
        Record<string, Array<{ id: string; totalActiveStake: string }>>
      >(query);
      stakeByBlock = parseRoundStakeResults(endBlocks, data);
    } catch {
      // Fallback to current stake
    }
  }

  const metadata = await Promise.all(
    sortedVotes.map((v) => resolveProposal(v.poll.proposal))
  );

  const yesCount = votes.filter((v) => v.choiceID === "Yes").length;
  const noCount = votes.filter((v) => v.choiceID === "No").length;

  return (
    <div className="min-h-screen">
      {/* Header */}
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
        {/* Identity */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <AddressAvatar address={address} ensAvatar={ensAvatar} size={40} />
            <h1 className="text-xl font-semibold text-text-primary min-w-0 truncate">
              {ensName ? (
                <>
                  {ensName}{" "}
                  <span className="text-[15px] font-normal text-text-tertiary font-mono">
                    {truncateAddress(address)}
                  </span>
                </>
              ) : (
                <span className="font-mono">{truncateAddress(address)}</span>
              )}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[12px] text-text-tertiary">
            {transcoder ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Orchestrator
              </span>
            ) : (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-surface-overlay text-text-tertiary border border-border-default">
                Delegator
              </span>
            )}
            {transcoder && (
              <>
                <span className="text-border-hover">·</span>
                <span>
                  Total Stake:{" "}
                  <span className="text-text-secondary">
                    {formatStake(transcoder.totalStake)} LPT
                  </span>
                </span>
              </>
            )}
            <span className="text-border-hover">·</span>
            <span>{votes.length} votes cast</span>
            <span className="text-border-hover">·</span>
            <span>
              <span className="text-vote-yes">{yesCount} Yes</span>
              {" / "}
              <span className="text-vote-no">{noCount} No</span>
            </span>
          </div>
        </div>

        {/* Voting History */}
        <div className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-3">
          Voting History
        </div>
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full">
            <thead className="border-b border-border-default bg-surface-raised">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Proposal
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Vote
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Vote Stake
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sortedVotes.map((vote, i) => {
                const meta = metadata[i];
                const endBlock = parseInt(vote.poll.endBlock);
                const pollTotalActiveStake = isPollActive(vote.poll)
                  ? currentTotalActiveStake
                  : (stakeByBlock.get(endBlock) ?? currentTotalActiveStake);
                const pollStatus = computePollStatus(
                  vote.poll,
                  pollTotalActiveStake
                );
                const title = meta
                  ? meta.lip
                    ? `LIP-${meta.lip}: ${meta.title}`
                    : meta.title
                  : `Poll ${vote.poll.id.slice(0, 10)}...`;

                return (
                  <tr
                    key={vote.id}
                    className="hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/polls/${vote.poll.id}`}
                        className="text-[13px] font-medium text-text-secondary hover:text-lp-green transition-colors line-clamp-1"
                      >
                        {title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          vote.choiceID === "Yes"
                            ? "bg-vote-yes/10 text-vote-yes"
                            : "bg-vote-no/10 text-vote-no"
                        }`}
                      >
                        {vote.choiceID}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[13px] text-text-secondary">
                      {formatStake(vote.voteStake)}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={pollStatus} />
                    </td>
                  </tr>
                );
              })}
              {sortedVotes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[13px] text-text-tertiary"
                  >
                    No votes found for this address
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
