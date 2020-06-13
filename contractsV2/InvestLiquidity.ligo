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

function investLiquidity (const gs : gateway_storage; var s: dex_storage) :  list(operation) is
block {
    if amount > 0mutez then skip else failwith("01");
    if gs.tmp > 0n then skip else failwith("02");
    const tezPerShare : nat = s.tezPool / s.totalShares;
    if amount >= tezPerShare * 1mutez then skip else failwith("03");
    const sharesPurchased : nat = (amount / 1mutez) / tezPerShare;
    if sharesPurchased >= gs.tmp then skip else failwith("04");
    
    const tokensRequired : nat = sharesPurchased * s.tokenPool / s.totalShares;
    const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;
    s.shares[gs.sender] := share + sharesPurchased;
    s.tezPool := s.tezPool + amount / 1mutez;
    s.tokenPool := s.tokenPool + tokensRequired;
    s.invariant := s.tezPool * s.tokenPool;
    s.totalShares := s.totalShares + sharesPurchased;

   var operations: list(operation) := list transaction(Transfer(gs.sender, gs.main, tokensRequired), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) ;
      transaction(UpdateStorage(s), 
      Tezos.amount,
      case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      );
    end; 
   case s.voters[gs.sender] of None -> 
     skip
     | Some(v) -> {
      case v.candidate of None -> skip 
      | Some(candidate) -> {
         case s.vetos[candidate] of None -> skip
         | Some(c) -> failwith ("05")
         end;

         const voterInfo : vote_info = record allowances = (map end : map(address, bool)); candidate = Some(candidate); end;
         case s.voters[gs.sender] of None -> skip
           | Some(v) -> {
              case v.candidate of None -> skip | Some(c) -> {
                s.votes[c]:= abs(get_force(c, s.votes) - share);
                v.candidate := Some(candidate);
                voterInfo := v;
              } end;
           }
           end;    
         s.voters[gs.sender]:= voterInfo;
         const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share + sharesPurchased;
         s.votes[candidate]:= newVotes;
         if (case s.votes[s.delegated] of None -> 0n | Some(v) -> v end) > newVotes then skip else {
            s.nextDelegated := s.delegated;
            s.delegated := candidate;
            operations :=  set_delegate(Some(candidate)) # operations;
         };
      } end;
   } end;
 } with (operations)


function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (investLiquidity(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end
