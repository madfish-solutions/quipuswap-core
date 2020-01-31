#include "IToken.ligo"
#include "IDex.ligo"
#include "IFactory.ligo"

function initializeExchange (const tokenAmount : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if s.invariant =/= 0n then failwith("Is initiated") else skip ;
    if s.invariant =/= 0n then failwith("Wrong invariant") else skip ;
    if s.totalShares =/= 0n then failwith("Wrong totalShares") else skip ;
    if amount < 1mutez then failwith("Wrong amount") else skip ;
    if tokenAmount < 10n then failwith("Wrong tokenAmount") else skip ;
    if amount > 500000000tz then failwith("Wrong amount") else skip ;
    
    s.tokenPool := tokenAmount;
    s.tezPool := amount / 1mutez;
    s.invariant := s.tezPool * s.tokenPool;
    s.shares[sender] := 1000n;
    s.totalShares := 1000n;
    s.init := True;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokenAmount);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
 } with (operations, s)

function tezToToken (const buyer : address; const recipient : address; const this : address; const tezIn : nat; const minTokensOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {

    if tezIn > 0n then skip else failwith("Wrong tezIn");
    if minTokensOut > 0n then skip else failwith("Wrong minTokensOut");

    const fee : nat = tezIn / s.feeRate;
    const newTezPool : nat = s.tezPool + tezIn;
    const tempTezPool : nat = abs(newTezPool - fee);
    const newTokenPool : nat = s.invariant / tempTezPool;
    const tokensOut : nat = s.tokenPool / newTokenPool;

    if tokensOut >= minTokensOut then skip else failwith("Wrong minTokensOut");
    if tokensOut <= s.tokenPool then skip else failwith("Wrong tokenPool");
    
    s.tezPool := newTezPool;
    s.tokenPool := newTokenPool;
    s.invariant := newTezPool * newTokenPool;
    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(this, recipient, tokensOut);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
 } with (operations, s)

function tokenToTez (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minTezOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minTezOut > 0n then skip else failwith("Wrong minTezOut");

    const fee : nat = tokensIn / s.feeRate;
    const newTokenPool : nat = s.tokenPool + tokensIn;
    const tempTokenPool : nat = abs(newTokenPool - fee);
    const newTezPool : nat = s.invariant / tempTokenPool;
    const tezOut : nat = s.tezPool / newTezPool;

    if tezOut >= minTezOut then skip else failwith("Wrong minTezOut");
    if tezOut <= s.tezPool then skip else failwith("Wrong tezPool");
    
    s.tokenPool := newTokenPool;
    s.tezPool := newTezPool;
    s.invariant := newTezPool * newTokenPool;
    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(buyer, this, tokensIn); 

    const receiver: contract(unit) = get_contract(recipient);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(unit, tezOut * 1mutez, receiver); end;
 } with (operations, s)

function tokenToTokenOut (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minTokensOut : nat; const tokenOutAddress: address; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minTokensOut > 0n then skip else failwith("Wrong minTezOut");

    const fee : nat = tokensIn / s.feeRate;
    const newTokenPool : nat = s.tokenPool + tokensIn;
    const tempTokenPool : nat = abs(newTokenPool - fee);
    const newTezPool : nat = s.invariant / tempTokenPool;
    const tezOut : nat = s.tezPool / newTezPool;

    if tezOut <= s.tezPool then skip else failwith("Wrong tezPool");

    s.tokenPool := newTokenPool;
    s.tezPool := newTezPool;
    s.invariant := newTezPool * newTokenPool;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(buyer, this, tokensIn);

    const factoryContract: contract(exchangeAction) = get_contract(s.factoryAddress);
    const receiver: contract(dexAction) = get_contract(this);
    const requestParams: exchangeAction = TokenToExchangeLookup(tokenOutAddress, recipient, minTokensOut);

    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(requestParams, tezOut * 1mutez, factoryContract); end;
 } with (operations, s)

function tokenToTokenIn (const recipient : address; const this : address; const minTokensOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
   if sender = s.factoryAddress then skip else failwith("Wrong minTezOut");
 } with tezToToken(sender, recipient, this, amount / 1mutez, minTokensOut, s)


function investLiquidity (const minShares : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
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

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokensRequired);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
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
  | InitializeExchange(n) -> initializeExchange(n, s)
  | TezToTokenSwap(n) -> tezToToken(sender, sender, this, amount / 1mutez, n, s)
  | TokenToTezSwap(n) -> tokenToTez(sender, sender, this, n.0, n.1, s)
  | TokenToTokenSwap(n) -> tokenToTokenOut(sender, sender, this, n.0, n.1, n.2, s)
  | TezToTokenPayment(n) -> tezToToken(sender, n.1, this, amount / 1mutez, n.0, s)
  | TokenToTezPayment(n) -> tokenToTez(sender, n.2, this, n.0, n.1, s)
  | TokenToTokenPayment(n) -> tokenToTokenOut(sender, n.2, this, n.0, n.1, n.3, s)
  | TokenToTokenIn(n) -> tokenToTokenIn(n.1, this, n.0, s)
  | InvestLiquidity(n) -> investLiquidity(n, s)
  | DivestLiquidity(n) -> divestLiquidity(n.0, n.1, n.2, s)
 end

// TODO: 
// - replace map with big_map