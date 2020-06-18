#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: (address * bool);
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (address * bool)
| SetMain of (address)

function setVotesDelegation (const gs : gateway_storage; var s: dex_storage)  :  list(operation) is
  block {
   if gs.sender = gs.tmp.0 then skip;
   else block {
      const src: vote_info = case s.voters[gs.sender] of None -> record allowances = (map[]: map(address, bool) ); candidate = (None:option(key_hash)) end 
      | Some(v) -> v 
      end ;
      src.allowances[gs.tmp.0] := gs.tmp.1;
      s.voters[gs.sender] := src;
   }
 } with list[
      transaction(UpdateStorage(s), 
      0tz,
      case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      );];

function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (setVotesDelegation(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end
