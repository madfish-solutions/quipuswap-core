#include "IGateway.ligo"

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
   if get_force(Tezos.sender, s.allowed) then skip else failwith ("Not permitted");
 } with case p of
  | GetStorage -> (list transaction(ReceiveDexStorage(s), Tezos.amount, (get_contract(Tezos.sender): contract(gatewayAction))); end, s) 
  | UpdateStorage(n) -> ((nil: list(operation)), n) 
//   | Default(n) -> ((nil: list(operation)), s) 
 end