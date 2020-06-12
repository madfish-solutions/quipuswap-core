#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: (nat * address);
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (nat * address)
| SetMain of (address)

function tezToToken (const gs : gateway_storage; var s: dex_storage) :  list(operation) is
 block {
    const tezIn : nat = Tezos.amount / 1mutez;
    if tezIn > 0n then skip else failwith("01");
    if gs.tmp.0 > 0n then skip else failwith("02");

    s.tezPool := s.tezPool + tezIn;
    const newTokenPool : nat = s.invariant / abs(s.tezPool - tezIn / s.feeRate);
    const tokensOut : nat = abs(s.tokenPool - newTokenPool);

    if tokensOut >= gs.tmp.0 then skip else failwith("03");
    
    s.tokenPool := newTokenPool;
    s.invariant := s.tezPool * newTokenPool;
 } with (list transaction(RequestTransfer(gs.tmp.1, tokensOut), 
   0tz,
   case (Tezos.get_entrypoint_opt("%requestTransfer", gs.main) : option(contract(z))) of Some(contr) -> contr
      | None -> (failwith("02"):contract(z))
      end 
   );
   transaction(UpdateStorage(s), 
   0tz,
   case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
      | None -> (failwith("01"):contract(y))
      end 
   );
 end)


function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (tezToToken(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end



