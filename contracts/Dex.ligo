#include "IToken.ligo"
#include "IFactory.ligo"

function initializeExchange (const tokenAmount : nat; const candidate : key_hash; var s: dex_storage ) :  (list(operation) * dex_storage) is
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

    s.candidates[sender]:= candidate;
    s.votes[candidate]:= 1000n;
    s.delegated := candidate;
 } with (list transaction(Transfer(sender, self_address, tokenAmount), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); set_delegate(Some(candidate)) ; end, s)

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

function investLiquidity (const minShares : nat; const candidate : key_hash; var s: dex_storage ) :  (list(operation) * dex_storage) is
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
    s.shares[sender] := share + sharesPurchased;
    s.tezPool := s.tezPool + amount / 1mutez;
    s.tokenPool := s.tokenPool + tokensRequired;
    s.invariant := s.tezPool * s.tokenPool;
    s.totalShares := s.totalShares + sharesPurchased;

    case s.candidates[sender] of | None -> block {
      skip
    } | Some(c) -> {
      const prevVotes: nat = case s.votes[c] of | None -> 0n | Some(v) -> v end;
      s.votes[c]:= abs(prevVotes - share);
    } end;

    s.candidates[sender]:= candidate;
    const prevVotes: nat = case s.votes[candidate] of | None -> 0n | Some(v) -> v end;
    const newVotes: nat = prevVotes + share + sharesPurchased;
    s.votes[candidate]:= newVotes;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokensRequired);
    var operations : list(operation) := list transaction(transferParams, 0mutez, tokenContract); end;
    
    const mainCandidateVotes: nat = case s.votes[s.delegated] of | None -> 0n | Some(v) -> v end;
    if mainCandidateVotes > newVotes then skip else block {
       s.delegated := candidate;
       const delegationOp: operation = set_delegate(Some(candidate));
       operations := cons(delegationOp, operations);
    };
 } with (operations, s)

function divestLiquidity (const sharesBurned : nat; const minTez : nat; const minTokens : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
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
    case s.candidates[sender] of | None -> block {
      skip
    } | Some(c) -> {
      const prevVotes: nat = case s.votes[c] of | None -> 0n | Some(v) -> v end;
      s.votes[c]:= abs(prevVotes - sharesBurned);
    } end;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(self_address, sender, tokensDivested);

    const receiver: contract(unit) = get_contract(sender);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(unit, tezDivested * 1mutez, receiver); end;
 } with (operations, s)

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | InitializeExchange(n) -> initializeExchange(n.0, n.1, s)
  | TezToTokenSwap(n) -> tezToToken(sender, this, amount / 1mutez, n, s)
  | TokenToTezSwap(n) -> tokenToTez(sender, sender, this, n.0, n.1, s)
  | TokenToTokenSwap(n) -> tokenToTokenOut(sender, sender, this, n.0, n.1, n.2, s)
  | TezToTokenPayment(n) -> tezToToken(n.1, this, amount / 1mutez, n.0, s)
  | TokenToTezPayment(n) -> tokenToTez(sender, n.2, this, n.0, n.1, s)
  | TokenToTokenPayment(n) -> tokenToTokenOut(sender, n.2, this, n.0, n.1, n.3, s)
  | InvestLiquidity(n) -> investLiquidity(n.0, n.1, s)
  | DivestLiquidity(n) -> divestLiquidity(n.0, n.1, n.2, s)
 end

