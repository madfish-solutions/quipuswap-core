#include "IDex.ligo"

type exchange_storage is record [
  tokenList         : set (address);
  tokenToExchange   : big_map(address, address);
  dexLambdas        : big_map(nat, dexFunc);
  tokenLambdas      : big_map(nat, tokenFunc);
]

type createDexFunc is (option(key_hash) * tez * full_dex_storage) -> (operation * address)

type factory_return is list(operation) * exchange_storage

type full_factory_return is list(operation) * exchange_storage

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
const accurancyMultiplier : nat = 1000000000000000n;
const vetoPeriod : int = 7889229;
const feeRate : nat = 333n;