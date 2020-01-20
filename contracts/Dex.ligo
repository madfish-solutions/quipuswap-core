#include "IToken.ligo"

type dex_storage is record 
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
| EthToTokenSwap of (nat * nat)
| TokenToEthSwap of (nat * nat * nat)
| EthToTokenPayment of (nat * nat * address)
| TokenToEthPayment of (nat * nat * nat * address)
| InvestLiquidity of (nat)
| DivestLiquidity of (nat * nat * nat)


function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block { 
    skip;
  } with ((nil:list(operation)), s)
