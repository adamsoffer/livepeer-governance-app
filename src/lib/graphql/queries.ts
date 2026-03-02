import { gql } from "graphql-request";

export const LATEST_ROUND = gql`
  query LatestRound {
    rounds(orderBy: startBlock, orderDirection: desc, first: 1) {
      id
      totalActiveStake
    }
  }
`;

export const ALL_POLLS = gql`
  query AllPolls {
    polls(orderBy: endBlock, orderDirection: desc, first: 100) {
      id
      proposal
      endBlock
      quorum
      quota
      tally {
        yes
        no
      }
      votes(first: 1000) {
        id
        voter
        choiceID
        voteStake
        nonVoteStake
        registeredTranscoder
      }
    }
  }
`;

export const POLL_DETAIL = gql`
  query PollDetail($id: ID!) {
    poll(id: $id) {
      id
      proposal
      endBlock
      quorum
      quota
      tally {
        yes
        no
      }
      votes(first: 1000, orderBy: voteStake, orderDirection: desc) {
        id
        voter
        choiceID
        voteStake
        nonVoteStake
        registeredTranscoder
      }
    }
    voteEvents(where: { poll: $id }, first: 1000) {
      voter
      timestamp
    }
  }
`;

export const TRANSCODER_STAKES = gql`
  query TranscoderStakes($ids: [ID!]!) {
    transcoders(where: { id_in: $ids }, first: 1000) {
      id
      totalStake
      active
    }
  }
`;

/**
 * Build a dynamic query to fetch the Round's totalActiveStake for each poll.
 * Uses the Round entity which has accurate per-round totalActiveStake,
 * unlike the protocol entity which may be stale.
 */
export function buildRoundStakeQuery(
  endBlocks: number[]
): string {
  const unique = [...new Set(endBlocks)];
  const fields = unique.map(
    (block, i) =>
      `r${i}: rounds(where: {startBlock_lte: ${block}}, orderBy: startBlock, orderDirection: desc, first: 1) { id totalActiveStake }`
  );
  return `{ ${fields.join("\n")} }`;
}

/**
 * Parse the results of buildRoundStakeQuery into a map of endBlock -> totalActiveStake.
 */
export function parseRoundStakeResults(
  endBlocks: number[],
  data: Record<string, Array<{ id: string; totalActiveStake: string }>>
): Map<number, number> {
  const unique = [...new Set(endBlocks)];
  const blockToStake = new Map<number, number>();
  unique.forEach((block, i) => {
    const rounds = data[`r${i}`];
    if (rounds && rounds.length > 0) {
      blockToStake.set(block, parseFloat(rounds[0].totalActiveStake));
    }
  });
  return blockToStake;
}

export const DELEGATOR_DELEGATES = gql`
  query DelegatorDelegates($ids: [ID!]!) {
    delegators(where: { id_in: $ids }, first: 1000) {
      id
      delegate {
        id
      }
    }
  }
`;

export const VOTES_BY_VOTER = gql`
  query VotesByVoter($voter: String!) {
    votes(where: { voter: $voter }, first: 1000) {
      id
      voter
      choiceID
      voteStake
      nonVoteStake
      registeredTranscoder
      poll {
        id
        proposal
        endBlock
        quorum
        quota
        tally {
          yes
          no
        }
      }
    }
  }
`;
