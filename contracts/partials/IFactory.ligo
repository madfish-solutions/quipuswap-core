#include "./IDex.ligo"

#if FA2_STANDARD_ENABLED
type token_identifier is (address * nat)
#else
type token_identifier is address
#endif

type exchange_storage is record [
  token_list          : set (token_identifier);
  token_to_exchange   : big_map(token_identifier, address);
  dex_lambdas         : big_map(nat, dex_func);
  token_lambdas       : big_map(nat, token_func);
]

type create_dex_func is (option(key_hash) * tez * full_dex_storage) -> (operation * address)

type factory_return is list(operation) * exchange_storage

type full_factory_return is list(operation) * exchange_storage

type launch_exchange_params is record [
  token          : token_identifier;
  token_amount   : nat;
]

type set_token_function_params is record [
  func    : token_func;
  index   : nat;
]
type set_dex_function_params is record [
  func    : dex_func;
  index   : nat;
]

type exchange_action is
| LaunchExchange        of launch_exchange_params
| SetDexFunction        of set_dex_function_params
| SetTokenFunction      of set_token_function_params

#if TEST_ENABLED
const voting_period : int = 10;
#else
const voting_period : int = 2592000;
#endif
const accurancy_multiplier : nat = 1000000000000000n;
const veto_period : int = 7889229;

type transfer_type is TransferType of transfer_params
