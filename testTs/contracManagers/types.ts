import BigNumber from "bignumber.js";

export declare type DexStorage = {
  tez_pool: BigNumber;
  token_pool: BigNumber;
  invariant: BigNumber;
  token_address: string;
  total_supply: BigNumber;
  ledger: { [key: string]: AccountInfo };
  voters: { [key: string]: VoteInfo };
  vetos: { [key: string]: BigNumber };
  votes: { [key: string]: BigNumber };
  veto: BigNumber;
  current_delegated: string | null | undefined;
  current_candidate: string | null | undefined;
  total_votes: BigNumber;
  reward_info: RewardInfo;
  user_rewards: { [key: string]: UserRewardInfo };
  last_veto: number;
};

export declare type RewardInfo = {
  reward: BigNumber;
  loyalty_per_share: BigNumber;
  last_loyalty_per_share: BigNumber;
  total_accomulated_loyalty: BigNumber;
  last_update_time: string;
  last_period_finish: string;
  period_finish: string;
  reward_per_token: BigNumber;
};

export declare type UserRewardInfo = {
  reward: BigNumber;
  reward_paid: BigNumber;
  loyalty: BigNumber;
  loyalty_paid: BigNumber;
  update_time: string;
};

export declare type AccountInfo = {
  balance: BigNumber;
  frozen_balance: BigNumber;
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
  last_veto: number;
};

export declare type TokenStorage = {
  total_supply: BigNumber;
  ledger: { [key: string]: AccountTokenInfo };
};

export declare type FactoryStorage = {
  token_list: string[];
  token_to_exchange: { [key: string]: string };
  dex_lambdas: { [key: number]: any };
  token_lambdas: { [key: number]: any };
};
