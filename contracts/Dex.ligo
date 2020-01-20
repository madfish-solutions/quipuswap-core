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

function initializeExchange (const tokenAmount : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 begin
    if s.invariant =/= 0n or s.totalShares =/= 0n or amount < 10000tz or tokenAmount < 10000n or amount > 5000000tz then failwith("Wrong params") else skip ;
    
    s.tokenPool := tokenAmount;
    s.ethPool := amount / 1tz;
    s.invariant := s.ethPool * s.tokenPool;
    s.shares[sender] := 1000n;
    s.totalShares := 1000n;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokenAmount);
    const operations : list(operation) = list transaction(transferParams, 0tz, tokenContract); end;
 end with (operations, s)

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block { 
    skip;
  } with ((nil:list(operation)), s)
  //  with case p of
  // | Request(n) -> (requestBalance(n.0, n.1, n.2), s)
  // | Receive(n) -> ((nil : list(operation)), receive(n))
//  end

