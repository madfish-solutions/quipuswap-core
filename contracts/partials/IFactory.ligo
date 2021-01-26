#include "./IDex.ligo"

(* Storage types *)

#if FA2_STANDARD_ENABLED
type token_identifier is (address * nat)
#else
type token_identifier is address
#endif

(* record for factory storage *)
type exchange_storage is record [
  token_list          : set (token_identifier); (* all the deployed list *)
  token_to_exchange   : big_map(token_identifier, address); (* token to exchange pairs *)
  dex_lambdas         : big_map(nat, dex_func); (* map with exchange-related functions code *)
  token_lambdas       : big_map(nat, token_func); (* map with token-related functions code *)
]

type create_dex_func is (option(key_hash) * tez * full_dex_storage) -> (operation * address)

type factory_return is list(operation) * exchange_storage

type full_factory_return is list(operation) * exchange_storage

(* Entrypoint types *)

type launch_exchange_params is record [
  token          : token_identifier; (* identifier of the token*)
  token_amount   : nat; (* number of tokens sent as initial liquidity *)
]

type set_token_function_params is record [
  func    : token_func; (* code of the function *)
  index   : nat; (* the key in functions map *)
]

type set_dex_function_params is record [
  func    : dex_func; (* code of the function *)
  index   : nat; (* the key in functions map *)
]

type exchange_action is
| LaunchExchange        of launch_exchange_params (* deploys a new empty Dex for token, stores the address of the new contract, and puts initial liquidity *)
| SetDexFunction        of set_dex_function_params (* sets the dex specific function. Is used before the whole system is launched *) 
| SetTokenFunction      of set_token_function_params (* sets the FA function, is used before the whole system is launched *)

#if TEST_ENABLED
const voting_period : int = 10; (* seconds between baker rewards distribution *)
#else
const voting_period : int = 2592000; (* seconds between baker rewards distribution *)
#endif
const accurancy_multiplier : nat = 1000000000000000n; (* used to improve calculations accuracy *)
const veto_period : int = 7889229; (* seconds to ban the user for *)

type transfer_type is TransferType of transfer_params 

#if FA2_STANDARD_ENABLED
const token_func_count : nat = 2n;
#else
const token_func_count : nat = 4n;
#endif
