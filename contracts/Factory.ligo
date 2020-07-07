#include "IFactory.ligo"

type x is Transfer of michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type w is TokenToExchangeLookup1 of (address * address * nat)
type z is Use1 of (nat * dexAction) 
type y is SetSettings1 of big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage))

function initializeExchange (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> {
      if s.invariant =/= 0n 
      or s.totalShares =/= 0n 
      or amount < 1mutez 
      or tokenAmount < 10n 
      or amount > 500000000tz then failwith("Dex/non-allowed") else skip ;
      // if s.totalShares =/= 0n then failwith("Dex/non-zero-total-shares") else skip ;
      // if amount < 1mutez then failwith("Dex/low-tez") else skip ;
      // if tokenAmount < 10n then failwith("Dex/low-token") else skip ;
      // if amount > 500000000tz then failwith("Dex/high-tez") else skip ;
      
      s.tokenPool := tokenAmount;
      s.tezPool := Tezos.amount / 1mutez;
      s.invariant := s.tezPool * s.tokenPool;
      s.shares[Tezos.sender] := 1000n;
      s.totalShares := 1000n;

       // update user loyalty
       s.currentCircle.lastUpdate := Tezos.now;
       s.circleLoyalty[Tezos.sender] := record reward = 0n; loyalty = 0n; lastCircle = 0n; lastCircleUpdate = Tezos.now; end;

      operations := transaction(
         Transfer(Tezos.sender, (this, tokenAmount)), 
         0mutez, 
         case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
         ) # operations;
   }
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(n) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
   end
 } with (operations, s)

function setVotesDelegation (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> 
      if Tezos.sender = n.0 then skip
      else block {
         const src: vote_info = case s.voters[Tezos.sender] of None -> record allowances = (set [] : set(address)); candidate = (None:option(key_hash)) end 
            | Some(v) -> v 
            end ;
         src.allowances := if n.1 then Set.add (n.0, src.allowances) else Set.remove (n.0, src.allowances);
         s.voters[Tezos.sender] := src;
      }
   | Vote(n) -> failwith("00")
   | Veto(n) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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
    if Tezos.sender =/= voter or voterInfo.allowances contains Tezos.sender then {
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
    } else failwith ("Dex/vote-not-permitted");

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
      case s.vetos[n.1] of None -> skip
        | Some(c) -> if c < Tezos.now then failwith ("Dex/veto-candidate") else remove n.1 from map s.vetos
      end;

      const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(n.1); end;
      case s.voters[n.0] of None -> skip
        | Some(v) -> {
           case v.candidate of None -> skip | Some(c) -> {
             if s.totalVotes < share then failwith ("Dex/invalid-shares") else skip;
             s.totalVotes := abs(s.totalVotes - share);
             s.votes[c]:= abs(get_force(c, s.votes) - share);
             v.candidate := Some(n.1);
             voterInfo := v;
           } end;
        }
        end;    
      if Tezos.sender =/= n.0 or voterInfo.allowances contains Tezos.sender then skip else failwith ("Dex/vote-not-permitted");
      s.voters[n.0]:= voterInfo;
      s.totalVotes := s.totalVotes + share;
      const newVotes: nat = (case s.votes[n.1] of  None -> 0n | Some(v) -> v end) + share;
      s.votes[n.1]:= newVotes;
      if case s.delegated of None -> True 
        | Some(delegated) ->
           if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then False else True
        end
      then
      {
         s.delegated := Some(n.1);
      } else skip;
   }
   | Veto(n) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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
      if Tezos.sender =/= voter or src.allowances contains Tezos.sender then skip else failwith ("Dex/vote-not-permitted");

      const share : nat = get_force (voter, s.shares);
      var newShare: nat := 0n;
      case s.vetoVoters[voter] of None -> newShare := share
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
            s.vetos[c] := Tezos.now + 7889229;
            s.currentDelegated := (None: option(key_hash));
            operations := set_delegate(s.currentDelegated) # operations;
            s.vetoVoters := (big_map end : big_map(address, nat));
         }
         end;
      } else skip;
      s.vetoVoters[voter] := share;
   }
   | WithdrawProfit(n) -> failwith("00")
   end
 } with (operations, s)


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
       operations :=  transaction(
         Transfer(this, (n.1, tokensOut)), 
         0mutez, 
         case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
         ) # operations;
      //  operations :=  transaction(Transfer(this, (n.1, tokensOut)), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) # operations;

   }
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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
      operations:= list transaction(
         Transfer(Tezos.sender, (this, n.0)), 
         0mutez, 
         case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end); 
         transaction(unit, n.1 * 1mutez, (get_contract(n.2) : contract(unit))); end;
      // operations:= list transaction(Transfer(Tezos.sender, (this, n.0)), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(unit, n.1 * 1mutez, (get_contract(n.2) : contract(unit))); end;

   }
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(n) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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
      // operations := list transaction(Transfer(Tezos.sender, (this, n.0)), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(TokenToExchangeLookup(n.2, n.3, n.1), tezOut * 1mutez, (get_contract(s.factoryAddress): contract(exchangeAction))); end;
      operations := list transaction(Transfer(Tezos.sender, (this, n.0)), 
      0mutez,          
      case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
      | None -> (failwith("01"):contract(x))
      end);
      transaction(TokenToExchangeLookup1(n.2, n.3, n.1), 
      tezOut * 1mutez,          
      case (Tezos.get_entrypoint_opt("%tokenToExchangeLookup", s.factoryAddress) : option(contract(w))) of Some(contr) -> contr
      | None -> (failwith("01"):contract(w))
      end);
      end;
   }
   | InvestLiquidity(minShares) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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

       s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
       s.currentCircle.lastUpdate := Tezos.now;

       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tokensRequired : nat = sharesPurchased * tokensPerShare;
       const share : nat = case s.shares[Tezos.sender] of | None -> 0n | Some(share) -> share end;

       // update user loyalty
       var userCircle : user_circle_info := case s.circleLoyalty[Tezos.sender] of None -> record reward = 0n; loyalty = 0n; lastCircle = s.currentCircle.counter; lastCircleUpdate = Tezos.now; end
       | Some(c) -> c
       end;
       if userCircle.lastCircle =/= s.currentCircle.counter then {
          var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
          userCircle.loyalty := 0n;
          userCircle.lastCircleUpdate := circle.start;
       } else skip;

       if s.currentCircle.counter - userCircle.lastCircle > 1 then {
          const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
          const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
       } else skip;
       userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
       userCircle.lastCircleUpdate := Tezos.now;
       userCircle.lastCircle := s.currentCircle.counter;
       s.circleLoyalty[Tezos.sender] := userCircle;

       s.shares[Tezos.sender] := share + sharesPurchased;
       s.tezPool := s.tezPool + amount / 1mutez;
       s.tokenPool := s.tokenPool + tokensRequired;
       s.invariant := s.tezPool * s.tokenPool;
       s.totalShares := s.totalShares + sharesPurchased;

       operations := transaction(Transfer(Tezos.sender, (this, tokensRequired)), 
       0mutez, 
       case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
         ) # operations;
      //  operations := transaction(Transfer(sender, (this, tokensRequired)), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) # operations; 

       case s.voters[Tezos.sender] of None -> 
         skip
         | Some(v) -> { 
          case v.candidate of None -> skip 
          | Some(candidate) -> {
            case s.vetos[candidate] of None -> skip
              | Some(c) -> if c < Tezos.now then failwith ("Dex/veto-candidate") else remove candidate from map s.vetos
            end;

            const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(candidate); end;
            case s.voters[Tezos.sender] of None -> skip
              | Some(v) -> {
                 case v.candidate of None -> skip | Some(c) -> {
                   if s.totalVotes < share then failwith ("Dex/invalid-shares") else skip;
                   s.totalVotes := abs(s.totalVotes - share);
                   s.votes[c]:= abs(get_force(c, s.votes) - share);
                   v.candidate := Some(candidate);
                   voterInfo := v;
                 } end;
              }
              end;    
            s.voters[Tezos.sender]:= voterInfo;
            s.totalVotes := s.totalVotes + share + sharesPurchased;
            const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share + sharesPurchased;
            s.votes[candidate]:= newVotes;
            if case s.delegated of None -> True 
              | Some(delegated) ->
                 if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then True else False
              end
            then
            {
               s.delegated := Some(candidate);
            } else skip;
          } end;
       } end;
   }
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
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

       s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
       s.currentCircle.lastUpdate := Tezos.now;

       const tezPerShare : nat = s.tezPool / s.totalShares;
       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tezDivested : nat = tezPerShare * n.0;
       const tokensDivested : nat = tokensPerShare * n.0;

       if tezDivested >= n.1 then skip else failwith("Dex/high-tez-out");
       if tokensDivested >= n.2 then skip else failwith("Dex/high-tokens-out");

       // update user loyalty
       var userCircle : user_circle_info := get_force(Tezos.sender, s.circleLoyalty);
       if userCircle.lastCircle =/= s.currentCircle.counter then {
          var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
          userCircle.loyalty := 0n;
          userCircle.lastCircleUpdate := circle.start;
       } else skip;

       if s.currentCircle.counter - userCircle.lastCircle > 1 then {
          const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
          const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
          userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
       } else skip;
       userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
       userCircle.lastCircleUpdate := Tezos.now;
       userCircle.lastCircle := s.currentCircle.counter;
       s.circleLoyalty[Tezos.sender] := userCircle;

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
       operations := list transaction(Transfer(this, (Tezos.sender, tokensDivested)), 
       0mutez,          
       case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
         ); 
       transaction(unit, tezDivested * 1mutez, (get_contract(Tezos.sender) : contract(unit))); end;
      //  operations := list transaction(Transfer(this, (sender, tokensDivested)), 0mutez, (get_contract(s.tokenAddress) : contract(tokenAction))); transaction(unit, tezDivested * 1mutez, (get_contract(sender) : contract(unit))); end;

   }
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> failwith("00")
   end
 } with (operations, s)
function receiveReward (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage)is block {
    s.currentCircle.reward := s.currentCircle.reward + Tezos.amount / 1mutez;
    var operations : list(operation) := (nil: list(operation)); 
    if s.currentCircle.nextCircle < Tezos.now then block {
      s.currentCircle.nextCircle := Tezos.now;
      s.currentCircle.circleCoefficient := abs(Tezos.now - s.currentCircle.start) * s.currentCircle.reward / s.currentCircle.totalLoyalty + s.currentCircle.circleCoefficient;
      s.circles[s.currentCircle.counter] := s.currentCircle;
      s.currentCircle.reward := 0n;
      s.currentCircle.counter := s.currentCircle.counter + 1n;
      s.currentCircle.totalLoyalty := 0n;
      s.currentCircle.start := Tezos.now;
      // s.currentCircle.nextCircle := Tezos.now + 1474560;
      s.currentCircle.nextCircle := Tezos.now + 3;

      if case s.delegated of None -> False
         | Some(delegated) ->
            case s.currentDelegated of None -> True
               | Some(currentDelegated) -> delegated =/= currentDelegated
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

function withdrawProfit (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> failwith("00")
   | TokenToTezPayment(n) -> failwith("00")
   | TokenToTokenPayment(n) -> failwith("00")
   | InvestLiquidity(minShares) -> failwith("00")
   | DivestLiquidity(n) -> failwith("00")
   | SetVotesDelegation(n) -> failwith("00")
   | Vote(n) -> failwith("00")
   | Veto(voter) -> failwith("00")
   | WithdrawProfit(n) -> {
      var userCircle : user_circle_info := get_force(Tezos.sender, s.circleLoyalty);
      var share : nat := get_force(Tezos.sender, s.shares);
      if userCircle.lastCircle =/= s.currentCircle.counter then {
         var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
         userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
         userCircle.loyalty := 0n;
         userCircle.lastCircleUpdate := circle.start;
      } else skip;
      if s.currentCircle.counter - userCircle.lastCircle > 1 then {
         const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
         const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
         userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
      } else skip;
      userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
      userCircle.lastCircleUpdate := Tezos.now;
      userCircle.lastCircle := s.currentCircle.counter;
      share := userCircle.reward;
      userCircle.reward := 0n;
      s.circleLoyalty[Tezos.sender] := userCircle;
      operations := transaction(unit, share * 1mutez, (get_contract(n) : contract(unit))) # operations;
   }
   end
 } with (operations, s)


function launchExchange (const self : address; const token : address; var s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    if s.tokenList contains token then failwith("Exchange launched") else skip;
      s.tokenList := Set.add (token, s.tokenList);
      const createDex : (option(key_hash) * tez * full_dex_storage) -> (operation * address) =
      [%Michelson ( {| { UNPPAIIR ;
                        CREATE_CONTRACT 
#include "Dex.tz"
                  ;
                        PAIR } |}
               : (option(key_hash) * tez * full_dex_storage) -> (operation * address))];
      const res : (operation * address) = createDex((None : option(key_hash)), 0tz, record 
         storage = 
            record      
               feeRate = 333n;      
               tezPool = 0n;      
               tokenPool = 0n;      
               invariant = 0n;      
               totalShares = 0n;      
               tokenAddress = token;      
               factoryAddress = self;      
               shares = (big_map end : big_map(address, nat));      
               voters = (big_map end : big_map(address, vote_info));      
               vetos = (big_map end : big_map(key_hash, timestamp));      
               vetoVoters = (big_map end : big_map(address, nat));      
               votes = (big_map end : big_map(key_hash, nat));      
               veto = 0n;      
               delegated = (None: option(key_hash));      
               currentDelegated = (None: option(key_hash));      
               totalVotes = 0n;      
               currentCircle = 
                  record         
                     reward = 0n;         
                     counter = 0n;         
                     start = Tezos.now; 
                     circleCoefficient = 0n;        
                     lastUpdate = Tezos.now;         
                     totalLoyalty = 0n;         
                     nextCircle = Tezos.now;       
                  end;
               circles = (big_map end : big_map(nat, circle_info));      
               circleLoyalty = (big_map end : big_map(address, user_circle_info));   
            end;   
         lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
         end);
      s.tokenToExchange[token] := res.1;
 } with (list[res.0], s)

function setFunction (const idx: nat; const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) ;const s : full_exchange_storage) : full_exchange_storage is
 block {
    case s.storage.lambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.storage.lambdas[idx] := f end;
 } with s

function middle (const token : address ; var s : full_exchange_storage) :  (list(operation) * full_exchange_storage) is
 block {
    const res : (list(operation) * exchange_storage) = case s.lambdas[0n] of 
    | Some(f) -> f(Tezos.self_address, token, s.storage)
    | None -> (failwith("Factory/function-not-set"): (list(operation) * exchange_storage)) end;
    s.storage := res.1;
 } with (res.0, s)

function main (const p : exchangeAction ; const s : full_exchange_storage) :
  (list(operation) * full_exchange_storage) is case p of
    LaunchExchange(n) -> middle(n, s)
  | TokenToExchangeLookup(n) -> (
  list transaction(Use1(1n, TezToTokenPayment(n.2, n.1)), 
   Tezos.amount, 
   case (Tezos.get_entrypoint_opt("%use", get_force(n.0, s.storage.tokenToExchange)) : option(contract(z))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(z))
         end
   ) end
  , s)
  | ConfigDex(n) -> (list
      transaction(SetSettings1(s.storage.lambdas),
      0tez,
      case (Tezos.get_entrypoint_opt("%setSettings", get_force(n, s.storage.tokenToExchange)) : option(contract(y))) of Some(contr) -> contr
      | None -> (failwith("01"):contract(y))
      end
      )
    end, s)
  | SetFunction(n) -> ((nil:list(operation)), if n.0 > 10n then (failwith("Factory/functions-set") : full_exchange_storage) else  setFunction(n.0, n.1, s))
 end
