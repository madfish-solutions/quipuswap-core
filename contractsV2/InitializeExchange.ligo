#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: nat;
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (nat)
| SetMain of (address)

function initializeExchange (const gs : gateway_storage; var s: dex_storage ) :  (list(operation)) is
 block {
    if s.invariant =/= 0n then failwith("01") else skip ;
    if s.totalShares =/= 0n then failwith("02") else skip ;
    if amount < 1mutez then failwith("03") else skip ;
    if gs.tmp < 10n then failwith("04") else skip ;
    if amount > 500000000tz then failwith("05") else skip ;
    
    s.tokenPool := gs.tmp;
    s.tezPool := Tezos.amount / 1mutez;
    s.invariant := s.tezPool * s.tokenPool;
    s.shares[gs.sender] := 1000n;
    s.totalShares := 1000n;
 } with (list transaction(Transfer(gs.sender, gs.main, gs.tmp), 
      0mutez, 
      (get_contract(s.tokenAddress): contract(tokenAction))); 
      transaction(UpdateStorage(s), 
      0tz,
      case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      );
      end)

function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (initializeExchange(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end



