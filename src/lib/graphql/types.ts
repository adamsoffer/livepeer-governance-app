export type PollChoice = "Yes" | "No";

export interface PollTally {
  yes: string;
  no: string;
}

export interface Vote {
  id: string;
  voter: string;
  choiceID: PollChoice;
  voteStake: string;
  nonVoteStake: string;
  registeredTranscoder: boolean;
  timestamp: number | null;
}

export interface VoteEvent {
  voter: string;
  timestamp: number;
}

export interface Poll {
  id: string;
  proposal: string;
  endBlock: string;
  quorum: string;
  quota: string;
  tally: PollTally | null;
  votes: Vote[];
}

export interface Transcoder {
  id: string;
  totalStake: string;
  active: boolean;
}

export interface ProposalMetadata {
  lip: number | null;
  title: string;
  author?: string;
  status?: string;
  created?: string;
  discussionsTo?: string;
  body: string;
}

export type PollStatus = "active" | "passed" | "rejected" | "quorum-not-met";

export interface PollWithMetadata extends Poll {
  metadata: ProposalMetadata | null;
  status: PollStatus;
  yesPercentage: number;
  noPercentage: number;
  totalVoteStake: number;
}

export interface DelegatorOverride {
  voter: string;
  ensName: string | null;
  choiceID: PollChoice;
  voteStake: string;
  timestamp: number | null;
}

export interface VoteWithStake extends Vote {
  transcoderTotalStake: string | null;
  ensName: string | null;
  delegatorOverrides: DelegatorOverride[];
}

export interface NonVoter {
  address: string;
  totalStake: string;
  ensName: string | null;
}
