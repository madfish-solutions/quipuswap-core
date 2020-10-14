import BigNumber from "bignumber.js";

export declare type DexStorage = {
  tezPool: BigNumber;
  tokenPool: BigNumber;
  invariant: BigNumber;
  tokenAddress: string;
  factoryAddress: string;
  totalSupply: BigNumber;
  ledger: { [key: string]: AccountInfo };
  voters: { [key: string]: VoteInfo };
  vetos: { [key: string]: BigNumber };
  votes: { [key: string]: BigNumber };
  veto: BigNumber;
  currentDelegated: string | null | undefined;
  currentCandidate: string | null | undefined;
  totalVotes: BigNumber;
  rewardInfo: RewardInfo;
  userRewards: { [key: string]: UserRewardInfo };
};

export declare type RewardInfo = {
  reward: BigNumber;
  totalAccomulatedLoyalty: BigNumber;
  lastUpdateTime: BigNumber;
  periodFinish: BigNumber;
  rewardPerToken: BigNumber;
};

export declare type UserRewardInfo = {
  reward: BigNumber;
  rewardPaid: BigNumber;
  loyalty: BigNumber;
  loyaltyPaid: BigNumber;
};

export declare type AccountInfo = {
  balance: BigNumber;
  frozenBalance: BigNumber;
  allowances: { [key: string]: BigNumber };
};

export declare type AccountTokenInfo = {
  balance: BigNumber;
  allowances: { [key: string]: BigNumber };
};

export declare type VoteInfo = {
  candidate: string | null | undefined;
  vote: BigNumber;
  veto: BigNumber;
};

export declare type TokenStorage = {
  totalSupply: BigNumber;
  ledger: { [key: string]: AccountTokenInfo };
};

export declare type FactoryStorage = {
  tokenList: string[];
  tokenToExchange: { [key: string]: string };
  dexLambdas: { [key: BigNumber]: any };
  tokenLambdas: { [key: BigNumber]: any };
};
