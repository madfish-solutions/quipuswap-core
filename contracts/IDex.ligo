type vote_info is record
  allowances: set(address);
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
  vetos: big_map(key_hash, timestamp);
  vetoVoters: big_map(address, nat);
  votes: big_map(key_hash, nat);
  veto: nat;
  delegated: key_hash;
  nextDelegated: key_hash;
  currentDelegated : key_hash;
  totalVotes: nat;
  currentCircle: nat;
  nextCircle: timestamp;
  reward: tez;
  circles: big_map(nat, tez);
end

type dexAction is
| InitializeExchange of (nat)
| TezToTokenPayment of (nat * address)
| TokenToTezPayment of (nat * nat * address)
| TokenToTokenPayment of (nat * nat * address * address)
| InvestLiquidity of (nat)
| DivestLiquidity of (nat * nat * nat)
| SetVotesDelegation of (address * bool)
| Vote of (address * key_hash)
| Veto of (address)

type fullAction is
| Use of (nat * dexAction)
| SetSettings of (nat * ((dexAction * dex_storage * address) -> (list(operation) * dex_storage)))

type full_dex_storage is record
  storage: dex_storage;
  lambdas: big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage));
end
