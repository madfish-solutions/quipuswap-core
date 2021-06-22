import BigNumber from "bignumber.js";

export declare type TokenInfo = {
  token_a_address: string;
  token_b_address: string;
  token_a_id?: BigNumber;
  token_b_id?: BigNumber;
  token_a_type: { [key: string]: any };
  token_b_type: { [key: string]: any };
};

export declare type PairInfo = {
  token_a_pool: BigNumber;
  token_b_pool: BigNumber;
  total_supply: BigNumber;
};

export declare type SwapSliceType = {
  pair: TokenInfo;
  operation: { [key: string]: any };
};

export declare type TTDexStorage = {
  dex_lambdas: { [key: string]: any };
  token_lambdas: { [key: string]: any };
  pairs_count: BigNumber;
  tokens: { [key: string]: TokenInfo };
  token_to_id: { [key: string]: BigNumber };
  pairs: { [key: string]: PairInfo };
  ledger: { [key: string]: AccountInfo };
};

export declare type DexStorage = {
  tez_pool: BigNumber;
  token_pool: BigNumber;
  baker_validator: string;
  token_address: string;
  total_supply: BigNumber;
  ledger: { [key: string]: AccountInfo };
  voters: { [key: string]: VoteInfo };
  vetos: { [key: string]: string };
  votes: { [key: string]: BigNumber };
  veto: BigNumber;
  current_delegated: string | null | undefined;
  current_candidate: string | null | undefined;
  total_votes: BigNumber;
  reward: BigNumber;
  total_reward: BigNumber;
  reward_per_share: BigNumber;
  reward_per_sec: BigNumber;
  last_update_time: string;
  period_finish: string;
  user_rewards: { [key: string]: UserRewardInfo };
  last_veto: number;
};

export declare type MetadataStorage = {
  metadata: { [key: string]: Buffer };
  owners: string[];
};

export declare type UserRewardInfo = {
  reward: BigNumber;
  reward_paid: BigNumber;
};

export declare type AccountInfo = {
  balance: BigNumber;
  frozen_balance?: BigNumber;
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
  total_supply?: BigNumber;
  ledger: { [key: string]: AccountTokenInfo };
};

export declare type FactoryStorage = {
  baker_validator: string;
  token_list: string[];
  token_to_exchange: { [key: string]: string };
  dex_lambdas: { [key: number]: any };
  token_lambdas: { [key: number]: any };
};
