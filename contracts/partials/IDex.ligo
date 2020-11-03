#if FA2_STANDARD_ENABLED
#include "./TypesFA2.ligo"
#endif

type account_info is record [
  balance           : nat;
  frozen_balance    : nat;
#if FA2_STANDARD_ENABLED
  allowances        : set (address);
#else
  allowances        : map (address, nat);
#endif
]

type vote_info is record [
  candidate   : option(key_hash);
  vote        : nat; 
  veto        : nat; 
  last_veto    : timestamp; 
] 

type user_reward_info is record [
  reward        : nat;
  reward_paid   : nat;
  loyalty       : nat;
  loyalty_paid  : nat;
  update_time   : timestamp;
]

type reward_info is record [
  reward                      : nat;
  loyalty_per_share           : nat;
  total_accomulated_loyalty   : nat;
  last_update_time            : timestamp;
  last_period_finish          : timestamp;
  period_finish               : timestamp;
  last_loyalty_per_share      : nat;
  reward_per_token            : nat;
]

type dex_storage is record [
#if FA2_STANDARD_ENABLED
  token_id            : token_id;
  // token_metadata      : big_map (token_id, token_metadata_info);
#endif
  tez_pool            : nat;
  token_pool          : nat;
  invariant           : nat;
  token_address       : address;
  total_supply        : nat;
  ledger              : big_map(address, account_info);
  voters              : big_map(address, vote_info);
  vetos               : big_map(key_hash, timestamp);
  votes               : big_map(key_hash, nat);
  veto                : nat;
  last_veto           : timestamp;
  current_delegated   : option(key_hash);
  current_candidate   : option(key_hash);
  total_votes         : nat;
  reward_info         : reward_info;
  user_rewards        : big_map(address, user_reward_info);
]

type tez_to_token_payment_params is record [
  amount    : nat; 
  receiver  : address; 
]

type token_to_tez_payment_params is record [
  amount       : nat; 
  min_out      : nat; 
  receiver     : address;
]

type divest_liquidity_params is record [
  min_tez      : nat; 
  min_tokens   : nat;
  shares       : nat; 
]

type vote_params is record [
  candidate   : key_hash;
  value       : nat; 
  voter       : address; 
]

type veto_params is record [
  value       : nat; 
  voter       : address; 
]

type dex_action is
| InitializeExchange      of (nat)
| TezToTokenPayment       of tez_to_token_payment_params
| TokenToTezPayment       of token_to_tez_payment_params
| InvestLiquidity         of (nat)
| DivestLiquidity         of divest_liquidity_params
| Vote                    of vote_params
| Veto                    of veto_params
| WithdrawProfit          of (address)

type default_params is unit
type use_params is (nat * dex_action)

#if FA2_STANDARD_ENABLED
#include "./ActionFA2.ligo"
#else
#include "./ActionFA12.ligo"
#endif

type return is list (operation) * dex_storage
type dex_func is (dex_action * dex_storage * address) -> return
type token_func is (token_action * dex_storage * address) -> return

type full_dex_storage is record
  storage        : dex_storage;
  dex_lambdas    : big_map(nat, dex_func);
  token_lambdas  : big_map(nat, token_func);
end

type full_return is list (operation) * full_dex_storage
