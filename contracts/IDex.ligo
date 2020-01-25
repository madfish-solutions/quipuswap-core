type dex_storage is record 
  init: bool;
  feeRate: nat;
  ethPool: nat;
  tokenPool: nat;
  invariant: nat;
  totalShares: nat;
  tokenAddress: address;
  factoryAddress: address;
  shares: map(address, nat);
end

type dexAction is
| InitializeExchange of nat
| EthToTokenSwap of nat
| TokenToEthSwap of (nat * nat)
| EthToTokenPayment of (nat * address)
| TokenToEthPayment of (nat * nat * address)
| InvestLiquidity of nat
| DivestLiquidity of (nat * nat * nat)

