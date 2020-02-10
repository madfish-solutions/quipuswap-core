type dex_storage is record 
  feeRate: nat;
  tezPool: nat;
  tokenPool: nat;
  invariant: nat;
  totalShares: nat;
  tokenAddress: address;
  factoryAddress: address;
  shares: map(address, nat);
  candidates: map(address, key_hash);
  votes: map(key_hash, nat);
  delegated: key_hash;
end

type dexAction is
| InitializeExchange of (nat * key_hash)
| TezToTokenSwap of nat
| TokenToTezSwap of (nat * nat)
| TokenToTokenSwap of (nat * nat * address)
| TokenToTokenIn of (nat * address)
| TezToTokenPayment of (nat * address)
| TokenToTezPayment of (nat * nat * address)
| TokenToTokenPayment of (nat * nat * address * address)
| InvestLiquidity of (nat * key_hash)
| DivestLiquidity of (nat * nat * nat)

