#include "./IDex.ligo"

#if FA2_STANDARD_ENABLED
type token_identifier is address
#else
type token_identifier is (address * nat)
#endif

type exchange_storage is record [
  tokenList         : set (token_identifier);
  tokenToExchange   : big_map(token_identifier, address);
  dexLambdas        : big_map(nat, dexFunc);
  tokenLambdas      : big_map(nat, tokenFunc);
]

type createDexFunc is (option(key_hash) * tez * full_dex_storage) -> (operation * address)

type factory_return is list(operation) * exchange_storage

type full_factory_return is list(operation) * exchange_storage

type launchExchangeParams is record [
#if FA2_STANDARD_ENABLED
  tokenId       : nat;
#endif
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

#if TEST_ENABLED
const votingPeriod : int = 10;
#else
const votingPeriod : int = 2592000;
#endif
const accurancyMultiplier : nat = 1000000000000000n;
const vetoPeriod : int = 7889229;
const feeRate : nat = 333n;