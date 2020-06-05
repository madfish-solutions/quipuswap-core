type vote_info is record
  approves: map(address, bool);
  vote: nat;
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
  candidates: big_map(address, key_hash);
  votes: big_map(key_hash, vote_info);
  veto: big_map(key_hash, nat);
  delegated: key_hash;
end

type dexAction is
| InitializeExchange of (nat)
| TezToTokenSwap of nat
| TokenToTezSwap of (nat * nat)
| TokenToTokenSwap of (nat * nat * address)
| TezToTokenPayment of (nat * address)
| TokenToTezPayment of (nat * nat * address)
| TokenToTokenPayment of (nat * nat * address * address)
| InvestLiquidity of (nat)
| DivestLiquidity of (nat * nat * nat)
// | SetVotesDelegation of (address * bool)
// | Vote of (address * key_hash)
// | Veto of (address)


