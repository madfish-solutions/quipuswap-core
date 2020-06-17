#include "IGateway.ligo"
#include "IToken.ligo"

type gateway_storage is 
record
  main: address;
  tmp: (address * key_hash);
  sender: address;
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (address * key_hash)
| SetMain of (address)

function vote (const gs : gateway_storage; var s: dex_storage)  :  list(operation) is
 block {
    const share : nat = get_force (sender, s.shares);
    const src: vote_info = get_force(gs.tmp.0, s.voters);
    if Tezos.sender =/= gs.tmp.0 or get_force(Tezos.sender, src.allowances) 
    then skip else failwith ("04");

    if s.vetos contains gs.tmp.1 then skip
    else failwith ("05");

    const voterInfo : vote_info = record allowances = (map end : map(address, bool)); candidate = Some(gs.tmp.1); end;
    case s.voters[gs.tmp.0] of None -> skip
      | Some(v) -> {
         case v.candidate of None -> skip | Some(c) -> {
           s.votes[c]:= abs(get_force(c, s.votes) - share);
           v.candidate := Some(gs.tmp.1);
           voterInfo := v;
         } end;
      }
      end;    
    s.voters[gs.tmp.0]:= voterInfo;
    const newVotes: nat = (case s.votes[gs.tmp.1] of  None -> 0n | Some(v) -> v end) + share;
    s.votes[gs.tmp.1]:= newVotes;

    var operations: list(operation) := list
      transaction(UpdateStorage(s), 
      0tz,
      case (Tezos.get_entrypoint_opt("%updateStorage", gs.main) : option(contract(y))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(y))
         end 
      );
    end;
    if (case s.votes[s.delegated] of None -> 0n | Some(v) -> v end) > newVotes then skip else {
       s.nextDelegated := s.delegated;
       s.delegated := gs.tmp.1;
       operations := set_delegate(Some(gs.tmp.1)) # operations;
    };
 } with (operations)

function main (const p : gatewayAction ; const s : gateway_storage) :
  (list(operation) * gateway_storage) is case p of
  | ReceiveDexStorage(n) -> (vote(s, n), s) 
  | Use(n) -> (list transaction(GetStorage(unit), 
         Tezos.amount, 
         case (Tezos.get_entrypoint_opt("%getStorage", s.main) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("00"):contract(x))
         end 
      ); end,
      (record tmp = n; sender = Tezos.sender; main = s.main; end: gateway_storage) ) 
  | SetMain(n) -> ((nil:list(operation)), if s.main=("tz1burnburnburnburnburnburnburjAYjjX":address) then record tmp = s.tmp; sender=Tezos.sender; main = n; end else (failwith("01"): gateway_storage)) 
 end
