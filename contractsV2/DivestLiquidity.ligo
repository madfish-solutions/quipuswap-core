#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: (nat * nat * nat);
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (nat * nat * nat)
| SetMain of (address)

function divestLiquidity (const gs : gateway_storage; var s: dex_storage) :  list(operation) is
block {
    if gs.tmp.0 > 0n then skip else failwith("03");
    const share : nat = case s.shares[gs.sender] of | None -> 0n | Some(share) -> share end;
    if gs.tmp.0 > share then failwith ("04") else skip;
    s.shares[gs.sender] := abs(share - gs.tmp.0);

    const tezPerShare : nat = s.tezPool / s.totalShares;
    const tokensPerShare : nat = s.tokenPool / s.totalShares;
    const tezDivested : nat = tezPerShare * gs.tmp.0;
    const tokensDivested : nat = tokensPerShare * gs.tmp.0;

    if tezDivested >= gs.tmp.1 then skip else failwith("05");
    if tokensDivested >= gs.tmp.2 then skip else failwith("06");

    s.totalShares := abs(s.totalShares - gs.tmp.0);
    s.tezPool := abs(s.tezPool - tezDivested);
    s.tokenPool := abs(s.tokenPool - tokensDivested);
    s.invariant := if s.totalShares = 0n then 0n; else s.tezPool * s.tokenPool;

   case s.voters[gs.sender] of None -> block {
     skip
   } | Some(v) -> {
      case v.candidate of None -> skip | Some(candidate) -> {
        const prevVotes: nat = get_force(candidate, s.votes);
        s.votes[candidate]:= abs(prevVotes - gs.tmp.0);
        if prevVotes = gs.tmp.0 then remove gs.sender from map s.voters; else skip;
      } end;
   } end;

 } with ( list
   transaction(RequestTransfer(gs.sender, tokensDivested, False), 
   0tz,
   case (Tezos.get_entrypoint_opt("%requestTransfer", gs.main) : option(contract(z))) of Some(contr) -> contr
      | None -> (failwith("02"):contract(z))
      end 
   );
   transaction(RequestTransfer(gs.sender, tezDivested, True), 
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
  | ReceiveDexStorage(n) -> (divestLiquidity(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end
