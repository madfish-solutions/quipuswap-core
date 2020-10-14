type account_info is record [
  balance           : nat;
  frozenBalance     : nat;
  allowances        : map (address, nat);
]

type vote_info is record [
  candidate   : option(key_hash);
  vote        : nat; 
  veto        : nat; 
] 

type user_reward_info is record [
  reward        : nat;
  rewardPaid    : nat;
  loyalty       : nat;
  loyaltyPaid   : nat;
]

type reward_info is record [
  reward                    : nat;
  totalAccomulatedLoyalty   : nat;
  lastUpdateTime            : timestamp;
  periodFinish              : timestamp;
  rewardPerToken            : nat;
]

type dex_storage is record [
  tezPool           : nat;
  tokenPool         : nat;
  invariant         : nat;
  tokenAddress      : address;
  factoryAddress    : address;
  totalSupply       : nat;
  ledger            : big_map(address, account_info);
  voters            : big_map(address, vote_info);
  vetos             : big_map(key_hash, timestamp);
  votes             : big_map(key_hash, nat);
  veto              : nat;
  currentDelegated  : option(key_hash);
  currentCandidate  : option(key_hash);
  totalVotes        : nat;
  rewardInfo        : reward_info;
  userRewards       : big_map(address, user_reward_info);
]

type tezToTokenPaymentParams is record [
  amount    : nat; 
  receiver  : address; 
]

type tokenToTezPaymentParams is record [
  amount      : nat; 
  minOut      : nat; 
  receiver    : address;
]

type divestLiquidityParams is record [
  minTez      : nat; 
  minTokens   : nat;
  shares      : nat; 
]

type voteParams is record [
  candidate   : key_hash;
  value       : nat; 
  voter       : address; 
]

type vetoParams is record [
  value       : nat; 
  voter       : address; 
]

type dexAction is
| InitializeExchange of (nat)
| TezToTokenPayment of tezToTokenPaymentParams
| TokenToTezPayment of tokenToTezPaymentParams
| InvestLiquidity of (nat)
| DivestLiquidity of divestLiquidityParams
| Vote of voteParams
| Veto of vetoParams
| WithdrawProfit of (address)

type defaultParams is unit
type useParams is (nat * dexAction)
type transferParams is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type approveParams is michelson_pair(address, "spender", nat, "value")
type balanceParams is michelson_pair(address, "owner", contract(nat), "")
type allowanceParams is michelson_pair(michelson_pair(address, "owner", address, "spender"), "", contract(nat), "")
type totalSupplyParams is (unit * contract(nat))

type tokenAction is
| ITransfer of transferParams
| IApprove of approveParams
| IGetBalance of balanceParams
| IGetAllowance of allowanceParams
| IGetTotalSupply of totalSupplyParams

type fullAction is
| Use of useParams
| Default of defaultParams
| Transfer of transferParams
| Approve of approveParams
| GetBalance of balanceParams
| GetAllowance of allowanceParams
| GetTotalSupply of totalSupplyParams

type return is list (operation) * dex_storage
type dexFunc is (dexAction * dex_storage * address) -> return
type tokenFunc is (tokenAction * dex_storage) -> return

type full_dex_storage is record
  storage       : dex_storage;
  dexLambdas    : big_map(nat, dexFunc);
  tokenLambdas  : big_map(nat, tokenFunc);
end

type full_return is list (operation) * full_dex_storage
