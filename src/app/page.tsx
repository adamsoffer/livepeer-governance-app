import { getClient } from "@/lib/graphql/client";
import {
  ALL_POLLS,
  LATEST_ROUND,
  buildRoundStakeQuery,
  parseRoundStakeResults,
} from "@/lib/graphql/queries";
import { resolveProposal } from "@/lib/ipfs";
import {
  computePollStatus,
  computePercentages,
  computeQuorum,
  isPollActive,
} from "@/lib/utils";
import { PollCard } from "@/components/poll-card";
import { LivepeerLogo } from "@/components/livepeer-logo";
import type { Poll } from "@/lib/graphql/types";

export const revalidate = 300;

async function getData() {
  const client = getClient();
  const [pollsData, latestRoundData] = await Promise.all([
    client.request<{ polls: Poll[] }>(ALL_POLLS),
    client.request<{
      rounds: Array<{ id: string; totalActiveStake: string }>;
    }>(LATEST_ROUND),
  ]);

  const polls = pollsData.polls;
  const currentTotalActiveStake = parseFloat(
    latestRoundData.rounds[0].totalActiveStake
  );

  // Fetch per-round totalActiveStake for each poll's endBlock
  const endBlocks = polls.map((p) => parseInt(p.endBlock));
  const query = buildRoundStakeQuery(endBlocks);
  const data = await client.request<
    Record<string, Array<{ id: string; totalActiveStake: string }>>
  >(query);
  const stakeByBlock = parseRoundStakeResults(endBlocks, data);

  return { polls, currentTotalActiveStake, stakeByBlock };
}

export default async function Home() {
  const { polls, currentTotalActiveStake, stakeByBlock } = await getData();

  const metadata = await Promise.all(
    polls.map((p) => resolveProposal(p.proposal))
  );

  const pollsWithData = polls.map((poll, i) => {
    const endBlock = parseInt(poll.endBlock);
    // Use round-level totalActiveStake; fall back to current for active polls
    const totalActiveStake = isPollActive(poll)
      ? currentTotalActiveStake
      : (stakeByBlock.get(endBlock) ?? currentTotalActiveStake);

    const { yesPercentage, noPercentage, totalVoteStake } =
      computePercentages(poll);
    const { quorumPercentage, quorumMet } = computeQuorum(
      poll,
      totalActiveStake
    );
    const yesVoters = poll.votes.filter((v) => v.choiceID === "Yes").length;
    const noVoters = poll.votes.filter((v) => v.choiceID === "No").length;

    return {
      poll,
      metadata: metadata[i],
      status: computePollStatus(poll, totalActiveStake),
      yesPercentage,
      noPercentage,
      totalVoteStake,
      quorumPercentage,
      quorumMet,
      yesVoters,
      noVoters,
    };
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border-default bg-surface-base/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <LivepeerLogo className="h-4 w-auto text-white" />
          <span className="text-[12px] font-mono text-text-tertiary uppercase tracking-wider">
            Governance
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="space-y-4">
          {pollsWithData.map(
            ({
              poll,
              metadata: meta,
              status,
              yesPercentage,
              noPercentage,
              totalVoteStake,
              quorumPercentage,
              quorumMet,
              yesVoters,
              noVoters,
            }) => (
              <PollCard
                key={poll.id}
                id={poll.id}
                metadata={meta}
                status={status}
                yesPercentage={yesPercentage}
                noPercentage={noPercentage}
                yesStake={poll.tally?.yes ?? "0"}
                noStake={poll.tally?.no ?? "0"}
                totalVoteStake={totalVoteStake}
                voterCount={poll.votes.length}
                quorumPercentage={quorumPercentage}
                quorumMet={quorumMet}
                yesVoters={yesVoters}
                noVoters={noVoters}
              />
            )
          )}
        </div>
      </main>
    </div>
  );
}
