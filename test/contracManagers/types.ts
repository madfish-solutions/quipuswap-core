export declare type DexStorage = {
  tezPool: number;
  tokenPool: number;
  invariant: number;
  tokenAddress: string;
  factoryAddress: string;
  totalSupply: number;
  ledger: { [key: string]: AccountInfo };
  voters: { [key: string]: VoteInfo };
  vetos: { [key: string]: number };
  votes: { [key: string]: number };
  veto: number;
  currentDelegated: string | null | undefined;
  currentCandidate: string | null | undefined;
  totalVotes: number;
  rewardInfo: RewardInfo;
  userRewards: { [key: string]: UserRewardInfo };
};

export declare type RewardInfo = {
  reward: number;
  totalAccomulatedLoyalty: number;
  lastUpdateTime: number;
  periodFinish: number;
  rewardPerToken: number;
};

export declare type UserRewardInfo = {
  reward: number;
  rewardPaid: number;
  loyalty: number;
  loyaltyPaid: number;
};

export declare type AccountInfo = {
  balance: number;
  frozenBalance: number;
  allowances: { [key: string]: number };
};

export declare type VoteInfo = {
  candidate: string | null | undefined;
  vote: number;
  veto: number;
};

export declare type TokenStorage = {
  totalSupply: number;
  ledger: { [key: string]: AccountInfo };
};
