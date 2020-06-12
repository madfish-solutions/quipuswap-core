#include "IGateway.ligo"
#include "IToken.ligo"


function initializeExchange (const mainAddress : address; const tokenAmount : nat; var s: dex_storage ) :  (list(operation)) is
 block {
    if s.invariant =/= 0n then failwith("Wrong invariant") else skip ;
    if s.totalShares =/= 0n then failwith("Wrong totalShares") else skip ;
    if amount < 1mutez then failwith("Wrong amount") else skip ;
    if tokenAmount < 10n then failwith("Wrong tokenAmount") else skip ;
    if amount > 500000000tz then failwith("Wrong amount") else skip ;
    
    s.tokenPool := tokenAmount;
    s.tezPool := Tezos.amount / 1mutez;
    s.invariant := s.tezPool * s.tokenPool;
    s.shares[sender] := 1000n;
    s.totalShares := 1000n;
 } with (list transaction(Transfer(Tezos.sender, mainAddress, tokenAmount), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(UpdateStorage(s), 0tz, (get_contract(mainAddress): contract(dexAction))); end)

function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (initializeExchange(s.main, s.tmp.0, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), Tezos.amount, (get_contract(s.main): contract(dexAction))); end, (record tmp = n; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), (record tmp = s.tmp; main = n; end: gateway_storage) ) 
 end
