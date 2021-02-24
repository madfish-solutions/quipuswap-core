#if FA2_STANDARD_ENABLED
#include "./TypesFA2.ligo"
#endif

(* Storage types *)

(* record that represents account shares *)
type account_info is record [
  balance           : nat; (* liquid tokens *)
  frozen_balance    : nat; (* tokens frozen to grant the veto or voting power *)
#if FA2_STANDARD_ENABLED
  allowances        : set (address); (* accounts allowed to act on behalf of the user *)
#else
  allowances        : map (address, nat); (* pairs of the accounts and the amount of tokens they are approed to use *)
#endif
]

(* record that represents account voting info *)
type vote_info is record [
  candidate   : option(key_hash); (* last chosen candidate *)
  vote        : nat; (* number of shares to be used for voting *)
  veto        : nat; (* number of shares to be used for voting agains the current delegate*)
  last_veto    : timestamp;  (* time of the last veto proposal by user *)
] 

(* record that represents account baker rewards info *)
type user_reward_info is record [
  reward        : nat; (* collected rewards *)
  reward_paid   : nat; (* last reward accumulator calculated as user_loyalty * reward_per_loyalty *)
]

(* record for the dex storage *)
type dex_storage is record [
#if FA2_STANDARD_ENABLED
  token_id            : token_id; (* token identifier *)
#endif
  tez_pool            : nat; (* tez reserves in the pool *)
  token_pool          : nat; (* token reserves in the pool *)
  invariant           : nat; (* liquidity invariant *)
  token_address       : address; (* address of the traded asset *)
  total_supply        : nat; (* total shares count *)
  ledger              : big_map(address, account_info); (* account info per address *)
  voters              : big_map(address, vote_info); (* voting info per user *)
  vetos               : big_map(key_hash, timestamp); (* time until the banned delegates can't be chosen *)
  votes               : big_map(key_hash, nat); (* votes per candidate *)
  veto                : nat; (* collected vetos for current delegated *)
  last_veto           : timestamp; (* last time the delegate was banned *)
  current_delegated   : option(key_hash); (* the account XTZ are currently delegated for *)
  current_candidate   : option(key_hash); (* the best candidate to become next delegated *)
  total_votes         : nat; (* total votes participated in voting*)
  reward              : nat; (* collected rewards *)
  total_reward        : nat; (* total collected rewards *)
  reward_paid         : nat; (* total paid rewards *)
  reward_per_share    : nat; (* loyalty score per each share *)
  reward_per_sec      : nat; (* loyalty score per each share *)
  last_update_time    : timestamp; (* last time the data was updated *)
  period_finish       : timestamp; (* time current period ends *)
  user_rewards        : big_map(address, user_reward_info); (* rawards info per account *)
]

(* Entrypoint arguments *)

type tez_to_token_payment_params is record [
  amount    : nat; (* min amount of tokens received to accept exchange *)
  receiver  : address; (* tokens receiver *)
]

type token_to_tez_payment_params is record [
  amount       : nat; (* amount of tokens to be exchanged *)
  min_out      : nat; (* min amount of XTZ received to accept exchange *)
  receiver     : address; (* tokens receiver *)
]

type divest_liquidity_params is record [
  min_tez      : nat; (* min amount of XTZ received to accept the divestment *) 
  min_tokens   : nat; (* min amount of tokens received to accept the divestment *)
  shares       : nat; (* amount of shares to be burnt *) 
]

type vote_params is record [
  candidate   : key_hash; (* the chosen baker *)
  value       : nat; (* amount of shares that are used to vote *) 
  voter       : address; (* the account from which the voting is done *) 
]

type veto_params is record [
  value       : nat; (* amount of shares that are used to vote against the chosen baker *) 
  voter       : address; (* the account from which the veto voting is done *) 
]

type dex_action is
| InitializeExchange      of (nat)  (* sets initial liquidity *)
| TezToTokenPayment       of tez_to_token_payment_params  (* exchanges XTZ to tokens and sends them to receiver *)
| TokenToTezPayment       of token_to_tez_payment_params  (* exchanges tokens to XTZ and sends them to receiver *)
| InvestLiquidity         of (nat)  (* mints min shares after investing tokens and XTZ *)
| DivestLiquidity         of divest_liquidity_params  (* burns shares and sends tokens and XTZ to the owner *)
| Vote                    of vote_params  (* votes for candidate with shares of voter *)
| Veto                    of veto_params  (* vote for banning candidate with shares of voter *)
| WithdrawProfit          of (address)  (* withdraws delegation reward of the sender to receiver address *)

type default_params is unit
type use_params is dex_action
type get_reserves_params is contract(nat * nat)

#if FA2_STANDARD_ENABLED
#include "./ActionFA2.ligo"
#else
#include "./ActionFA12.ligo"
#endif

type return is list (operation) * dex_storage
type dex_func is (dex_action * dex_storage * address) -> return
type token_func is (token_action * dex_storage * address) -> return

(* real dex storage *)
type full_dex_storage is record
  storage        : dex_storage; (* real dex storage *)
  dex_lambdas    : big_map(nat, dex_func); (* map with exchange-related functions code *)
  metadata       : big_map(string, bytes); (* metadata storage according to TZIP-016 *)
  token_lambdas  : big_map(nat, token_func); (* map with token-related functions code *)
end

type full_return is list (operation) * full_dex_storage

const fee_rate : nat = 333n; (* exchange fee rate distributed among the liquidity providers *)
