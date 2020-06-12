#include "IToken.ligo"
#include "IFactory.ligo"
#include "IDex.ligo"

function initializeExchange (const this : address; const tokenAmount : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
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
 } with (list transaction(Transfer(sender, this, tokenAmount), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); end, s)

function isAllowedVoter (const voter : address ; var s : dex_storage) : bool is 
  block {
    const src: vote_info = get_force(voter, s.voters);
  } with Tezos.sender =/= voter or get_force(Tezos.sender, src.allowances);

function setVotesDelegation (const voter : address ; const allowance : bool ; var s : dex_storage) : dex_storage is
  block {
   if Tezos.sender = voter then skip;
   else block {
      const src: vote_info = get_force(Tezos.sender, s.voters);
      src.allowances[voter] := allowance;
      s.voters[Tezos.sender] := src;
   }
 } with s

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

function vote (const voter : address; const candidate : key_hash; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    const share : nat = get_force (sender, s.shares);
    const res : (option(operation) * dex_storage) = redelegate(voter, candidate, share, share, s);
    var operations: list(operation) := (nil: list(operation));
    case res.0 of None -> skip 
    | Some(o) -> {
       operations := list o end;
    } end;
 } with (operations, res.1)

function veto (const voter : address; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
   const share : nat = get_force (sender, s.shares);
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
   var operations : list(operation) := (nil: list(operation)); 
   if s.veto > s.totalShares then {
      s.veto := 0n;
      s.vetos[s.delegated] := True;
      s.delegated := s.nextDelegated;
      s.vetoVoters := (big_map end : big_map(address, nat));
      operations := set_delegate(Some(s.nextDelegated)) # operations; 
   } else skip;
   s.vetoVoters[voter] := share;
} with (operations, s)

function tezToToken (const recipient : address; const this : address; const tezIn : nat; const minTokensOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tezIn > 0n then skip else failwith("Wrong tezIn");
    if minTokensOut > 0n then skip else failwith("Wrong minTokensOut");

    s.tezPool := s.tezPool + tezIn;
    const newTokenPool : nat = s.invariant / abs(s.tezPool - tezIn / s.feeRate);
    const tokensOut : nat = abs(s.tokenPool - newTokenPool);

    if tokensOut >= minTokensOut then skip else failwith("Wrong minTokensOut");
    
    s.tokenPool := newTokenPool;
    s.invariant := s.tezPool * newTokenPool;
 } with (list transaction(Transfer(this, recipient, tokensOut), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); end, s)

function tokenToTez (const buyer : address; const recepient : address; const this : address; const tokensIn : nat; const minTezOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minTezOut > 0n then skip else failwith("Wrong minTezOut");

    s.tokenPool := s.tokenPool + tokensIn;
    const newTezPool : nat = s.invariant / abs(s.tokenPool - tokensIn / s.feeRate);
    const tezOut : nat = abs(s.tezPool - newTezPool);

    if tezOut >= minTezOut then skip else failwith("Wrong minTezOut");

    s.tezPool := newTezPool;
    s.invariant := newTezPool * s.tokenPool;
 } with (list transaction(Transfer(buyer, this, tokensIn), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(unit, minTezOut * 1mutez, (get_contract(recepient) : contract(unit))); end, s)

function tokenToTokenOut (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minTokensOut : nat; const tokenOutAddress: address; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minTokensOut > 0n then skip else failwith("Wrong minTezOut");

    s.tokenPool := s.tokenPool + tokensIn;
    const newTezPool : nat = s.invariant / abs(s.tokenPool - tokensIn / s.feeRate);
    const tezOut : nat = abs(s.tezPool - newTezPool);
    s.tezPool := newTezPool;
    s.invariant := newTezPool * s.tokenPool;
 } with (list transaction(Transfer(buyer, this, tokensIn), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); transaction(TokenToExchangeLookup(tokenOutAddress, recipient, minTokensOut), tezOut * 1mutez, (get_contract(s.factoryAddress): contract(exchangeAction))); end, s)

function investLiquidity (const this : address; const minShares : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
block {
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

   var operations: list(operation) := list transaction(Transfer(sender, this, tokensRequired), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))) ; end; 
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
 } with (operations, s)

function divestLiquidity (const this : address; const sharesBurned : nat; const minTez : nat; const minTokens : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
block {
    if sharesBurned > 0n then skip else failwith("Wrong sharesBurned");
    const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;
    if sharesBurned > share then failwith ("Snder shares are too low") else skip;
    s.shares[sender] := abs(share - sharesBurned);

    const tezPerShare : nat = s.tezPool / s.totalShares;
    const tokensPerShare : nat = s.tokenPool / s.totalShares;
    const tezDivested : nat = tezPerShare * sharesBurned;
    const tokensDivested : nat = tokensPerShare * sharesBurned;

    if tezDivested >= minTez then skip else failwith("Wrong minTez");
    if tokensDivested >= minTokens then skip else failwith("Wrong minTokens");

    s.totalShares := abs(s.totalShares - sharesBurned);
    s.tezPool := abs(s.tezPool - tezDivested);
    s.tokenPool := abs(s.tokenPool - tokensDivested);
    s.invariant := if s.totalShares = 0n then 0n; else s.tezPool * s.tokenPool;

   case s.voters[Tezos.sender] of None -> block {
     skip
   } | Some(v) -> {
      case v.candidate of None -> skip | Some(candidate) -> {
        const prevVotes: nat = get_force(candidate, s.votes);
        s.votes[candidate]:= abs(prevVotes - sharesBurned);
        if prevVotes = sharesBurned then remove Tezos.sender from map s.voters; else skip;
      } end;
   } end;

 } with (list transaction(Transfer(this, sender, tokensDivested), 0mutez, (get_contract(s.tokenAddress) : contract(tokenAction))); transaction(unit, tezDivested * 1mutez, (get_contract(sender) : contract(unit))); end, s)

function initializeExchangeMiddle (const this : address; const tokenAmount : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.initializeExchange);
    const res : (list(operation) * dex_storage) = f(this, tokenAmount, s.storage);
    s.storage := res.1;
 } with (res.0, s)

function tezToTokenMiddle (const recipient : address; const this : address; const tezIn : nat; const minTokensOut : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.tezToToken);
    const res : (list(operation) * dex_storage) = f(recipient, this, tezIn, minTokensOut, s.storage);
    s.storage := res.1;
 } with (res.0, s)

function tokenToTezMiddle (const buyer : address; const recepient : address; const this : address; const tokensIn : nat; const minTezOut : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.tokenToTez);
    const res : (list(operation) * dex_storage) = f(buyer, recepient, this, tokensIn, minTezOut, s.storage);
    s.storage := res.1;
 } with (res.0, s)


function tokenToTokenOutMiddle (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minTokensOut : nat; const tokenOutAddress: address; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * address * address * nat * nat * address * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.tokenToTokenOut);
    const res : (list(operation) * dex_storage) = f(buyer, recipient, this, tokensIn, minTokensOut, tokenOutAddress, s.storage);
    s.storage := res.1;
 } with (res.0, s)


function investLiquidityMiddle (const this : address; const minShares : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.investLiquidity);
    const res : (list(operation) * dex_storage) = f(this, minShares, s.storage);
    s.storage := res.1;
 } with (res.0, s)

function divestLiquidityMiddle (const this : address; const sharesBurned : nat; const minTez : nat; const minTokens : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * nat * nat * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.divestLiquidity);
    const res : (list(operation) * dex_storage) = f(this, sharesBurned, minTez, minTokens, s.storage);
    s.storage := res.1;
 } with (res.0, s)

function setVotesDelegationMiddle (const voter : address ; const allowance : bool ; var s : full_dex_storage) : full_dex_storage is
 block {
    const f: (address * bool * dex_storage) -> (dex_storage) = get_force(0n, s.setVotesDelegation);
    s.storage := f(voter, allowance, s.storage);
 } with (s)

function voteMiddle (const voter : address; const candidate : key_hash; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * key_hash * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.vote);
    const res : (list(operation) * dex_storage) = f(voter, candidate, s.storage);
    s.storage := res.1;
 } with (res.0, s)


function vetoMiddle (const voter : address; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.veto);
    const res : (list(operation) * dex_storage) = f(voter, s.storage);
    s.storage := res.1;
 } with (res.0, s)

function main (const p : dexAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | InitializeExchange(n) -> initializeExchangeMiddle(this, n, s) 
//   | TezToTokenSwap(n) -> tezToTokenMiddle(Tezos.sender, this, amount / 1mutez, n, s) 
//   | TokenToTezSwap(n) -> tokenToTezMiddle(Tezos.sender, Tezos.sender, this, n.0, n.1, s) 
//   | TokenToTokenSwap(n) -> tokenToTokenOutMiddle(Tezos.sender, Tezos.sender, this, n.0, n.1, n.2, s)
  | TezToTokenPayment(n) -> tezToTokenMiddle(n.1, this, amount / 1mutez, n.0, s)
  | TokenToTezPayment(n) -> tokenToTezMiddle(Tezos.sender, n.2, this, n.0, n.1, s)
  | TokenToTokenPayment(n) -> tokenToTokenOutMiddle(Tezos.sender, n.2, this, n.0, n.1, n.3, s)
  | InvestLiquidity(n) -> investLiquidityMiddle(this, n, s)
  | DivestLiquidity(n) -> divestLiquidityMiddle(this, n.0, n.1, n.2, s) 
  | SetVotesDelegation(n) -> ((nil: list(operation)), setVotesDelegationMiddle(n.0, n.1, s))
  | Vote(n) -> voteMiddle(n.0, n.1, s)
  | Veto(n) -> vetoMiddle(n, s) 
  | Default(n) -> ((nil: list(operation)), s) 
 end