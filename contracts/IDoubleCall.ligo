type vote_info is record
  allowances: map(address, bool);
  candidate: option(key_hash);
end

type dex_storage is record 
  feeRate: nat;
  tezPool: nat;
  tokenPool: nat;
  invariant: nat;
  totalShares: nat;
  tokenAddress: address;
  factoryAddress: address;
  shares: big_map(address, nat);
  voters: big_map(address, vote_info);
  vetos: big_map(key_hash, bool);
  vetoVoters: big_map(address, nat);
  votes: big_map(key_hash, nat);
  veto: nat;
  delegated: key_hash;
  nextDelegated: key_hash;
end

type full_dex_storage is record
  storage: dex_storage;
  initializeInvest: big_map(nat, (address * nat * dex_storage) -> (list(operation) * dex_storage));
  tezToToken: big_map(nat, (address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage));
  tokenToTez: big_map(nat, (address * address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage));
  tokenToTokenOut: big_map(nat, (address * address * address * nat * nat * address * dex_storage) -> (list(operation) * dex_storage));
  investLiquidity: big_map(nat, (address * nat * dex_storage) -> (list(operation) * dex_storage));
  divestLiquidity: big_map(nat, (address * nat * nat * nat * dex_storage) -> (list(operation) * dex_storage));
  setVotesDelegation: big_map(nat, (address * bool * dex_storage) -> (dex_storage));
  vote: big_map(nat, (address * key_hash * dex_storage) -> (list(operation) * dex_storage));
  veto: big_map(nat, (address * dex_storage) -> (list(operation) * dex_storage));
end

type dexAction is
| InitializeExchange of (nat)
// comment me to fix compilation:
| TezToTokenSwap of nat
| TokenToTezSwap of (nat * nat)
| TokenToTokenSwap of (nat * nat * address)
// 
| TezToTokenPayment of (nat * address)
| TokenToTezPayment of (nat * nat * address)
| TokenToTokenPayment of (nat * nat * address * address)
| InvestLiquidity of (nat)
| DivestLiquidity of (nat * nat * nat)
| SetVotesDelegation of (address * bool)
| Vote of (address * key_hash)
| Veto of (address)
