#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: nat;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (nat)
| SetMain of (address)

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
 } with (list transaction(Transfer(Tezos.sender, mainAddress, tokenAmount), 
      0mutez, 
      (get_contract(s.tokenAddress): contract(tokenAction))); 
      transaction(UpdateStorage(s), 
      0tz,
      case (Tezos.get_entrypoint_opt("%updateStorage", mainAddress) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      );
      end)

function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (initializeExchange(s.main, s.tmp, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), (record tmp = s.tmp; main = n; end: gateway_storage) ) 
 end



