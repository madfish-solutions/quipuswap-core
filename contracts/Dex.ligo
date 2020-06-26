#include "IToken.ligo"
#include "IFactory.ligo"
#include "IDex.ligo"

function initializeExchange (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> {
      if s.invariant =/= 0n then failwith("Dex/non-zero-invariant") else skip ;
      if s.totalShares =/= 0n then failwith("Dex/non-zero-total-shares") else skip ;
      if amount < 1mutez then failwith("Dex/low-tez") else skip ;
      if tokenAmount < 10n then failwith("Dex/low-token") else skip ;
      if amount > 500000000tz then failwith("Dex/high-tez") else skip ;
      
      s.tokenPool := tokenAmount;
      s.tezPool := Tezos.amount / 1mutez;
      s.invariant := s.tezPool * s.tokenPool;
      s.shares[sender] := 1000n;
      s.totalShares := 1000n;
      operations := transaction(Transfer(sender, this, tokenAmount), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) # operations;
   }
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(n) -> failwith("00")
   end
 } with (operations, s)

function isAllowedVoter (const voter : address ; var s : dex_storage) : bool is 
  block {
    const src: vote_info = get_force(voter, s.voters);
  } with Tezos.sender =/= voter or src.allowances contains Tezos.sender;

function setVotesDelegation (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> {
      if Tezos.sender = n.0 then skip;
      else block {
         const src: vote_info = case s.voters[Tezos.sender] of None -> record allowances = (set [] : set(address)); candidate = (None:option(key_hash)) end 
            | Some(v) -> v 
            end ;
         src.allowances := if n.1 then Set.add (n.0, src.allowances) else Set.remove (n.0, src.allowances);
         s.voters[Tezos.sender] := src;
      }
   }
   | Vote(n) -> failwith("00")
   | Veto(n) -> failwith("00")
   end
 } with ((nil:list(operation)),s)

function redelegate (const voter : address; const candidate : key_hash; const prevShare : nat; const share : nat; var s: dex_storage ) :  (dex_storage) is
 block {
    case s.vetos[candidate] of None -> skip
      | Some(c) -> if c < Tezos.now then failwith ("Dex/veto-candidate") else remove candidate from map s.vetos
    end;

    const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(candidate); end;
    case s.voters[voter] of None -> skip
      | Some(v) -> {
         case v.candidate of None -> skip | Some(c) -> {
           if s.totalVotes < prevShare then failwith ("Dex/invalid-shares") else skip;
           s.totalVotes := abs(s.totalVotes - prevShare);
           s.votes[c]:= abs(get_force(c, s.votes) - prevShare);
           v.candidate := Some(candidate);
           voterInfo := v;
         } end;
      }
      end;    
    case Tezos.sender =/= voter or voterInfo.allowances contains Tezos.sender of 
    | False -> failwith ("Dex/vote-not-permitted")
    | True -> skip
    end;

    s.voters[voter]:= voterInfo;
    s.totalVotes := s.totalVotes + share;
    const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share;
    s.votes[candidate]:= newVotes;
    if case s.delegated of None -> True 
      | Some(delegated) ->
         if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then True else False
      end
    then
    {
       s.delegated := Some(candidate);
    } else skip;
 } with (s)

function vote (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> {
      const share : nat = get_force (Tezos.sender, s.shares);
      s := redelegate(n.0, n.1, share, share, s);
   }
   | Veto(n) -> failwith("00")
   end
 } with ((nil:list(operation)), s)

function veto (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> {
      const src: vote_info = get_force(voter, s.voters);
      case Tezos.sender =/= voter or src.allowances contains Tezos.sender of 
      | False -> failwith ("Dex/vote-not-permitted")
      | True -> skip
      end;

      const share : nat = get_force (voter, s.shares);
      var newShare: nat := 0n;
      case s.vetoVoters[voter] of None -> skip
      | Some(prev) -> {
         if share > prev then skip else failwith ("Dex/old-shares");
         newShare := abs(share - prev);
      } 
      end;
      s.veto := s.veto + newShare;
      if s.veto > s.totalVotes / 2n then {
         s.veto := 0n;
         case s.currentDelegated of None -> failwith ("Dex/no-delegated")
         | Some(c) -> {
            s.vetos[c] := Tezos.now + 31104000;
            s.currentDelegated := (None: option(key_hash));
            operations := set_delegate(s.currentDelegated) # operations;
            s.vetoVoters := (big_map end : big_map(address, nat));
         }
         end;
      } else skip;
      s.vetoVoters[voter] := share;
   }
   end
 } with ((nil : list(operation)), s)


function tezToToken (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> {
       if Tezos.amount / 1mutez > 0n then skip else failwith("Dex/low-tez-in");
       if n.0 > 0n then skip else failwith("Dex/low-min-tokens-out");
 
       s.tezPool := s.tezPool + Tezos.amount / 1mutez;
       const newTokenPool : nat = s.invariant / abs(s.tezPool - Tezos.amount / 1mutez / s.feeRate);
       const tokensOut : nat = abs(s.tokenPool - newTokenPool);
 
       if tokensOut >= n.0 then skip else failwith("Dex/high-min-tokens-out");
       
       s.tokenPool := newTokenPool;
       s.invariant := s.tezPool * newTokenPool;
       operations :=  transaction(Transfer(this, n.1, tokensOut), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) # operations;
   }
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   end
 } with (operations, s)

function tokenToTez (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> {
      if n.0 > 0n then skip else failwith("Dex/low-tokens-in");
      if n.1 > 0n then skip else failwith("Dex/low-min-tez-out");
  
      s.tokenPool := s.tokenPool + n.0;
      const newTezPool : nat = s.invariant / abs(s.tokenPool - n.0 / s.feeRate);
      const tezOut : nat = abs(s.tezPool - newTezPool);
  
      if tezOut >= n.1 then skip else failwith("Dex/high-min-tez-out");
  
      s.tezPool := newTezPool;
      s.invariant := newTezPool * s.tokenPool;
      operations:= list transaction(Transfer(Tezos.sender, this, n.0), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(unit, n.1 * 1mutez, (get_contract(n.2) : contract(unit))); end;
   }
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   end
 } with (operations, s)

function tokenToTokenOut (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> {
      if n.0 > 0n then skip else failwith("Dex/low-tokens-in");
      if n.1 > 0n then skip else failwith("Dex/low-min-tokens-out");
  
      s.tokenPool := s.tokenPool + n.0;
      const newTezPool : nat = s.invariant / abs(s.tokenPool - n.0 / s.feeRate);
      const tezOut : nat = abs(s.tezPool - newTezPool);
      s.tezPool := newTezPool;
      s.invariant := newTezPool * s.tokenPool;
      operations := list transaction(Transfer(Tezos.sender, this, n.0), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(TokenToExchangeLookup(n.2, n.3, n.1), tezOut * 1mutez, (get_contract(s.factoryAddress): contract(exchangeAction))); end;
   }
   | InvestLiquidity(minShares) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   end
 } with (operations, s)

function investLiquidity (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(minShares) -> {
       if amount > 0mutez then skip else failwith("Dex/low-tez");
       if minShares > 0n then skip else failwith("Dex/low-min-shares");
       const tezPerShare : nat = s.tezPool / s.totalShares;
       if amount >= tezPerShare * 1mutez then skip else failwith("Dex/high-tez");
       const sharesPurchased : nat = (amount / 1mutez) / tezPerShare;
       if sharesPurchased >= minShares then skip else failwith("Dex/high-min-shares");

       s.currentCircle.totalLoyalty := abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
       s.currentCircle.lastUpdate := Tezos.now;

       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tokensRequired : nat = sharesPurchased * tokensPerShare;
       const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;

       // update user loyalty
       var userCircle : user_circle_info := case s.circleLoyalty[Tezos.sender] of None -> record reward = 0tez; loyalty = 0n; lastCircle = s.currentCircle.counter; lastCircleUpdate = Tezos.now; end
       | Some(c) -> c
       end;
       if userCircle.lastCircle =/= s.currentCircle.counter then {
          var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
          userCircle.loyalty := 0n;
          userCircle.lastCircleUpdate := circle.start;
       } else skip;

       if s.currentCircle.counter =/= userCircle.lastCircle + 1n then {
          const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
          const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + share * (lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
       } else skip;
       userCircle.loyalty := share * abs(userCircle.lastCircleUpdate - s.currentCircle.start);
       userCircle.lastCircleUpdate := Tezos.now;

       s.shares[Tezos.sender] := share + sharesPurchased;
       s.tezPool := s.tezPool + amount / 1mutez;
       s.tokenPool := s.tokenPool + tokensRequired;
       s.invariant := s.tezPool * s.tokenPool;
       s.totalShares := s.totalShares + sharesPurchased;

       operations := transaction(Transfer(sender, this, tokensRequired), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) # operations; 
       case s.voters[Tezos.sender] of None -> 
         skip
         | Some(v) -> {
          case v.candidate of None -> skip 
          | Some(candidate) -> {
             s := redelegate (Tezos.sender, candidate, share, share + sharesPurchased, s);
          } end;
       } end;
   }
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   end
 } with (operations, s)

function divestLiquidity (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(minShares) -> failwith("00")
   | DivestLiquidity(n) -> {
       if n.0 > 0n then skip else failwith("Dex/low-shares-burned");
       const share : nat = case s.shares[Tezos.sender] of | None -> 0n | Some(share) -> share end;
       if n.0 > share then failwith ("Dex/high-shares-burned") else skip;
       s.shares[Tezos.sender] := abs(share - n.0);

       const tezPerShare : nat = s.tezPool / s.totalShares;
       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tezDivested : nat = tezPerShare * n.0;
       const tokensDivested : nat = tokensPerShare * n.0;

       if tezDivested >= n.1 then skip else failwith("Dex/high-tez-out");
       if tokensDivested >= n.2 then skip else failwith("Dex/high-tokens-out");

       s.totalShares := abs(s.totalShares - n.0);
       s.tezPool := abs(s.tezPool - tezDivested);
       s.tokenPool := abs(s.tokenPool - tokensDivested);
       s.invariant := if s.totalShares = 0n then 0n; else s.tezPool * s.tokenPool;

       case s.voters[Tezos.sender] of None -> block {
         skip
       } | Some(v) -> {
          case v.candidate of None -> skip | Some(candidate) -> {
            const prevVotes: nat = get_force(candidate, s.votes);
            s.votes[candidate]:= abs(prevVotes - n.0);
            if prevVotes = n.0 then remove Tezos.sender from map s.voters; else skip;
          } end;
       } end;
       operations := list transaction(Transfer(this, sender, tokensDivested), 0mutez, (get_contract(s.tokenAddress) : contract(tokenAction))); transaction(unit, tezDivested * 1mutez, (get_contract(sender) : contract(unit))); end;
   }
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   end
 } with (operations, s)

function middle (const p : dexAction ; const this: address; const idx: nat; const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(idx, s.lambdas);
    const res : (list(operation) * dex_storage) = f(p, s.storage, this);
    s.storage := res.1;
 } with (res.0, s)

function receiveReward (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage)is
block {
    s.currentCircle.reward := s.currentCircle.reward + Tezos.amount;
    var operations : list(operation) := (nil: list(operation)); 
    if s.currentCircle.nextCircle < Tezos.now then block {
      s.currentCircle.nextCircle := Tezos.now;
      s.currentCircle.circleCoefficient := abs(Tezos.now - s.currentCircle.start) * s.currentCircle.reward / s.currentCircle.totalLoyalty + s.currentCircle.circleCoefficient;
      s.circles[s.currentCircle.counter] := s.currentCircle;
      s.currentCircle.reward := 0tez;
      s.currentCircle.counter := s.currentCircle.counter + 1n;
      s.currentCircle.totalLoyalty := 0n;
      s.currentCircle.start := Tezos.now;
      s.currentCircle.nextCircle := Tezos.now + 1474560;
      // destribute logic
      //
      if case s.delegated of None -> False
         | Some(delegated) ->
            case s.currentDelegated of None -> True
               | Some(currentDelegated) -> if delegated = currentDelegated then False else True
               end
         end
      then {
         operations := set_delegate(s.delegated) # operations;
         s.currentDelegated := s.delegated;
      } else skip;
    } else skip ;
    s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
    s.currentCircle.lastUpdate := Tezos.now;
 } with (operations, s)


function useDefault (const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(9n, s.lambdas);
    const res : (list(operation) * dex_storage) = f(InitializeExchange(0n), s.storage, Tezos.self_address);
    s.storage := res.1;
 } with (res.0, s)



function setSettings (const idx: nat; const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) ;const s : full_dex_storage) : full_dex_storage is
 block {
    if idx > 9n then failwith("Only 10 functions are accepted") else skip;
    case s.lambdas[idx] of Some(n) -> failwith("Function exist") | None -> skip end;
    s.lambdas[idx] := f;
 } with s

function main (const p : fullAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | Default -> useDefault(s) 
  | Use(n) -> middle(n.1, this, n.0, s) 
  | SetSettings(n) -> ((nil:list(operation)), setSettings(n.0, n.1, s))
 end


// const initial_storage : full_dex_storage = 
// record
//    storage = record
//       feeRate = 500n;
//       tezPool = 0n;
//       tokenPool = 0n;
//       invariant = 0n;
//       totalShares = 0n;
//       tokenAddress = ("'$token'" : address);
//       factoryAddress = ("'$factory'" : address);
//       shares = (big_map end : big_map(address, nat));
//       voters = (big_map end : big_map(address, vote_info));
//       vetos = (big_map end : big_map(key_hash, timestamp));
//       vetoVoters = (big_map end : big_map(address, nat));
//       votes = (big_map end : big_map(key_hash, nat));
//       veto = 0n;
//       delegated = (None: option(key_hash));
//       currentDelegated = (None: option(key_hash));
//       totalVotes = 0n;
//       currentCircle = 0n;
//       nextCircle = timestamp;
//       reward = 0tz;
//       circles = (big_map end : big_map(nat, tez));
//    end;
//    lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
// end;

// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'  --michelson-format=json > storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = big_map[0n -> initializeExchange; 1n -> tezToToken; 2n -> tokenToTez; 3n -> tokenToTokenOut; 4n -> investLiquidity; 5n -> divestLiquidity; 6n -> setVotesDelegation; 7n -> vote; 8n -> veto];end'  --michelson-format=json > storage/Dex.json

// ligo compile-storage contracts/Dex.ligo main 'record
//    storage = record
//       feeRate = 500n;
//       tezPool = 0n;
//       tokenPool = 0n;
//       invariant = 0n;
//       totalShares = 0n;
//       tokenAddress = ("'$token'" : address);
//       factoryAddress = ("'$factory'" : address);
//       shares = (big_map end : big_map(address, nat));
//       voters = (big_map end : big_map(address, vote_info));
//       vetos = (big_map end : big_map(key_hash, timestamp));
//       vetoVoters = (big_map end : big_map(address, nat));
//       votes = (big_map end : big_map(key_hash, nat));
//       veto = 0n;
//       delegated = (None: option(key_hash));
//       currentDelegated = (None: option(key_hash));
//       totalVotes = 0n;
//       currentCircle = record
//          reward = 0tez;
//          counter = 0n;
//          start = Tezos.now;
//          lastUpdate = Tezos.now;
//          totalLoyalty = 0n;
//          nextCircle = Tezos.now;
//        end;
//       circles = (big_map end : big_map(nat, circle_info));
//       circleLoyalty = (big_map end : big_map(address, user_circle_info));
//    end;
//    lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
// end' --michelson-format=json > ./storage/Dex.json

// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = 0n;      nextCircle = timestamp;      reward = 0tz;      circles = (big_map end : big_map(nat, tez));   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' --michelson-format=json > ./storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0tez;         counter = 0n;         start = Tezos.now;         lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, tez));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' --michelson-format=json > ./storage/Dex.json
