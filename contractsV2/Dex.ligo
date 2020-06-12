#include "IDex.ligo"
type x is ReceiveDexStorage of dex_storage

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
   if get_force(Tezos.sender, s.allowed) then skip else failwith ("Not permitted");
 } with case p of
  | GetStorage -> (list transaction(ReceiveDexStorage(s), 
  Tezos.amount, 
  case (Tezos.get_entrypoint_opt("%receiveDexStorage", Tezos.sender) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
   )
  end, s) 
  | UpdateStorage(n) -> ((nil: list(operation)), n) 
//   | Default(n) -> ((nil: list(operation)), s) 
 end