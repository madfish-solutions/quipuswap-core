#include "IToken.ligo"
#include "IFactory.ligo"
#include "IDex.ligo"

function initializeExchange (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> {
      if s.invariant =/= 0n then failwith("Wrong invariant") else skip ;
      if s.totalShares =/= 0n then failwith("Wrong totalShares") else skip ;
      if amount < 1mutez then failwith("Wrong amount") else skip ;
      if tokenAmount < 10n then failwith("Wrong tokenAmount") else skip ;
      if amount > 500000000tz then failwith("Wrong amount") else skip ;
      
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
  } with Tezos.sender =/= voter or get_force(Tezos.sender, src.allowances);

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
         const src: vote_info = get_force(Tezos.sender, s.voters);
         src.allowances[n.0] := n.1;
         s.voters[Tezos.sender] := src;
      }
   }
   | Vote(n) -> failwith("00")
   | Veto(n) -> failwith("00")
   end
 } with ((nil:list(operation)),s)

function redelegate (const voter : address; const candidate : key_hash; const prevShare : nat; const share : nat; var s: dex_storage ) :  (option(operation) * dex_storage) is
 block {
    case isAllowedVoter(voter, s) of 
    | False -> failwith ("Sender not allowed to spend token from source")
    | True -> skip
    end;

    case s.vetos[candidate] of None -> skip
    | Some(c) -> failwith ("Candidate was banned by veto")
    end;

    const voterInfo : vote_info = record allowances = (map end : map(address, bool)); candidate = Some(candidate); end;
    case s.voters[voter] of None -> skip
      | Some(v) -> {
         case v.candidate of None -> skip | Some(c) -> {
           s.votes[c]:= abs(get_force(c, s.votes) - prevShare);
           v.candidate := Some(candidate);
           voterInfo := v;
         } end;
      }
      end;    
    s.voters[voter]:= voterInfo;
    const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share;
    s.votes[candidate]:= newVotes;

    var operations: option(operation) := None;
    if (case s.votes[s.delegated] of None -> 0n | Some(v) -> v end) > newVotes then skip else {
       s.nextDelegated := s.delegated;
       s.delegated := candidate;
       operations := Some(set_delegate(Some(candidate)));
    };
 } with (operations, s)

function vote (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
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
   | Vote(n) -> {
      const share : nat = get_force (Tezos.sender, s.shares);
      const res : (option(operation) * dex_storage) = redelegate(n.0, n.1, share, share, s);
      case res.0 of None -> skip 
      | Some(o) -> {
         operations := list o end;
      } end;   
   }
   | Veto(n) -> failwith("00")
   end
 } with (operations, s)

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
      const share : nat = get_force (Tezos.sender, s.shares);
      case isAllowedVoter(voter, s) of 
      | False -> failwith ("Sender not allowed to spend token from source")
      | True -> skip
      end;
      var newShare: nat := 0n;
      case s.vetoVoters[voter] of None -> skip
      | Some(prev) -> {
         if share > prev then skip else failwith ("No new shares were erned");
         newShare := abs(share - prev);
      } 
      end;
      s.veto := s.veto + newShare;
      if s.veto > s.totalShares then {
         s.veto := 0n;
         s.vetos[s.delegated] := True;
         s.delegated := s.nextDelegated;
         s.vetoVoters := (big_map end : big_map(address, nat));
         operations := set_delegate(Some(s.nextDelegated)) # operations; 
      } else skip;
      s.vetoVoters[voter] := share;
   }
   end
 } with (operations, s)


function tezToToken (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
 block {
   var operations: list(operation) := list[];
   case p of
   | InitializeExchange(tokenAmount) -> failwith("00")
   | TezToTokenPayment(n) -> {
       if Tezos.amount / 1mutez > 0n then skip else failwith("Wrong tezIn");
       if n.0 > 0n then skip else failwith("Wrong minTokensOut");
 
       s.tezPool := s.tezPool + Tezos.amount / 1mutez;
       const newTokenPool : nat = s.invariant / abs(s.tezPool - Tezos.amount / 1mutez / s.feeRate);
       const tokensOut : nat = abs(s.tokenPool - newTokenPool);
 
       if tokensOut >= n.0 then skip else failwith("Wrong minTokensOut");
       
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
      if n.0 > 0n then skip else failwith("Wrong tokensIn");
      if n.1 > 0n then skip else failwith("Wrong minTezOut");
  
      s.tokenPool := s.tokenPool + n.0;
      const newTezPool : nat = s.invariant / abs(s.tokenPool - n.0 / s.feeRate);
      const tezOut : nat = abs(s.tezPool - newTezPool);
  
      if tezOut >= n.1 then skip else failwith("Wrong minTezOut");
  
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
      if n.0 > 0n then skip else failwith("Wrong tokensIn");
      if n.1 > 0n then skip else failwith("Wrong minTezOut");
  
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
       if amount > 0mutez then skip else failwith("Wrong amount");
       if minShares > 0n then skip else failwith("Wrong tokenAmount");
       const tezPerShare : nat = s.tezPool / s.totalShares;
       if amount >= tezPerShare * 1mutez then skip else failwith("Wrong tezPerShare");
       const sharesPurchased : nat = (amount / 1mutez) / tezPerShare;
       if sharesPurchased >= minShares then skip else failwith("Wrong sharesPurchased");

       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tokensRequired : nat = sharesPurchased * tokensPerShare;
       const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;
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
             const redelegateRes : (option(operation) * dex_storage) = redelegate (Tezos.sender, candidate, share, share + sharesPurchased, s);
             s := redelegateRes.1;
             case redelegateRes.0 of None -> skip 
             | Some(o) -> {
                operations := o # operations;
             } end;
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
       if n.0 > 0n then skip else failwith("Wrong sharesBurned");
       const share : nat = case s.shares[Tezos.sender] of | None -> 0n | Some(share) -> share end;
       if n.0 > share then failwith ("Snder shares are too low") else skip;
       s.shares[Tezos.sender] := abs(share - n.0);

       const tezPerShare : nat = s.tezPool / s.totalShares;
       const tokensPerShare : nat = s.tokenPool / s.totalShares;
       const tezDivested : nat = tezPerShare * n.0;
       const tokensDivested : nat = tokensPerShare * n.0;

       if tezDivested >= n.1 then skip else failwith("Wrong minTez");
       if tokensDivested >= n.2 then skip else failwith("Wrong minTokens");

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

function setSettings (const idx: nat; const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) ;const s : full_dex_storage) : full_dex_storage is
 block {
    case s.lambdas[idx] of Some(n) -> failwith("Function exist") | None -> skip end;
    s.lambdas[idx] := f;
 } with s

function main (const p : fullAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
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
//       tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);
//       factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);
//       shares = (big_map end : big_map(address, nat));
//       voters = (big_map end : big_map(address, vote_info));
//       vetos = (big_map end : big_map(key_hash, bool));
//       vetoVoters = (big_map end : big_map(address, nat));
//       votes = (big_map end : big_map(key_hash, nat));
//       veto = 0n;
//       delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);
//       nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);
//    end;
//    lambdas = big_map[0n -> initializeExchange; 1n -> tezToToken; 2n -> tokenToTez; 3n -> tokenToTokenOut; 4n -> investLiquidity; 5n -> divestLiquidity; 6n -> setVotesDelegation; 7n -> vote; 8n -> veto];
// end;

// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'  --michelson-format=json > storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = big_map[0n -> initializeExchange; 1n -> tezToToken; 2n -> tokenToTez; 3n -> tokenToTokenOut; 4n -> investLiquidity; 5n -> divestLiquidity; 6n -> setVotesDelegation; 7n -> vote; 8n -> veto];end'  --michelson-format=json > storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = big_map[0n -> initializeExchange; 1n -> tezToToken; ];end'  --michelson-format=json > storage/Dex.json

