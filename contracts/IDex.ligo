type dex_storage is record 
  feeRate: nat;
  tezPool: nat;
  tokenPool: nat;
  invariant: nat;
  totalShares: nat;
  tokenAddress: address;
  factoryAddress: address;
  shares: map(address, nat);
end

type dexAction is
| InitializeExchange of nat
| TezToTokenSwap of nat
| TokenToTezSwap of (nat * nat)
| TokenToTokenSwap of (nat * nat * address)
| TokenToTokenIn of (nat * address)
| TezToTokenPayment of (nat * address)
| TokenToTezPayment of (nat * nat * address)
| TokenToTokenPayment of (nat * nat * address * address)
| InvestLiquidity of nat
| DivestLiquidity of (nat * nat * nat)

