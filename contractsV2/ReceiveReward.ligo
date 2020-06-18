#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is address;

type gatewayAction is
| Use of (tez * dex_storage)
| SetMain of (address)

function receiveReward (const a: tez; const gs : gateway_storage; var s: dex_storage) :  list(operation) is
block {
    if gs = Tezos.sender then skip else failwith("03");
    s.reward := s.reward + a;
    var operations : list(operation) := (nil: list(operation)); 
    if s.next_circle < Tezos.now then block {
      s.circles[s.current_circle] := s.reward;
      s.reward := 0tez;
      s.current_circle := s.current_circle +1n;
      s.next_circle := Tezos.now + 1474560;
      // destribute logic
      //
      if s.current_delegated = s.delegated then skip else {
        operations := transaction(RequestOperation(Some(s.delegated)), 
        0tz,
        case (Tezos.get_entrypoint_opt("%requestOperation", gs) : option(contract(m))) of Some(contr) -> contr
            | None -> (failwith("01"):contract(m))
            end 
        ) # operations;
        s.current_delegated := s.delegated;
      }
    } else skip ;
    operations :=
    transaction(UpdateStorage(s), 
    0tz,
    case (Tezos.get_entrypoint_opt("%updateStorage", gs) : option(contract(y))) of Some(contr) -> contr
       | None -> (failwith("01"):contract(y))
       end 
    ) # operations; 
 } with (operations)


function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | Use(n) -> (receiveReward(n.0, s, n.1), s) 
  | SetMain(n) -> ((nil:list(operation)), if s = ("tz1burnburnburnburnburnburnburjAYjjX":address) then n else (failwith("01"): gateway_storage)) 
 end
