#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: address;
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (address)
| SetMain of (address)

function veto (const gs : gateway_storage; var s: dex_storage)  :  list(operation) is
 block {
   const share : nat = get_force (sender, s.shares);
    const src: vote_info = get_force(gs.tmp, s.voters);
    if Tezos.sender =/= gs.tmp or get_force(Tezos.sender, src.allowances) 
    then skip else failwith ("04");
   var newShare: nat := 0n;
   case s.vetoVoters[gs.tmp] of None -> skip
   | Some(prev) -> {
      if share > prev then skip else failwith ("No new shares were erned");
      newShare := abs(share - prev);
   } 
   end;
   s.veto := s.veto + newShare;
   var operations : list(operation) := (nil: list(operation)); 
   if s.veto > s.totalShares then {
      s.veto := 0n;
      s.vetos[s.delegated] := Tezos.now + 31104000;
      s.delegated := s.nextDelegated;
      s.vetoVoters := (big_map end : big_map(address, nat));
      operations := transaction(RequestOperation(Some(s.nextDelegated)), 
       0tz,
       case (Tezos.get_entrypoint_opt("%requestOperation", gs.main) : option(contract(m))) of Some(contr) -> contr
          | None -> (failwith("01"):contract(m))
          end 
       ) # operations;
   } else skip;
   operations :=
      transaction(UpdateStorage(s), 
      0tz,
      case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      ) # operations; 
   s.vetoVoters[gs.tmp] := share;
} with operations


function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (veto(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end
