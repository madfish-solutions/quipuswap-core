#include "IDex.ligo"

type exchange_storage is record [
  tokenList         : set (address);
  tokenToExchange   : big_map(address, address);
  dexLambdas        : big_map(nat, dexFunc);
  tokenLambdas      : big_map(nat, tokenFunc);
]

type createDexFunc is (option(key_hash) * tez * full_dex_storage) -> (operation * address)
type factory_return is list(operation) * exchange_storage

type full_exchange_storage is exchange_storage
// record [
//   storage   : exchange_storage;
//   // lambdas   : big_map(nat, (address * address * nat * exchange_storage) -> factory_return);
// ]

type full_factory_return is list(operation) * full_exchange_storage

type launchExchangeParams is record [
  token         : address;
  tokenAmount   : nat;
]

type setTokenFunctionParams is record [
  func    : tokenFunc;
  index   : nat;
]
type setDexFunctionParams is record [
  func    : dexFunc;
  index   : nat;
]

type exchangeAction is
| LaunchExchange of launchExchangeParams
| SetDexFunction of setDexFunctionParams
| SetTokenFunction of setTokenFunctionParams

const votingPeriod : int = 3; // 1474560
const vetoPeriod : int = 7889229;
const feeRate : nat = 333n;