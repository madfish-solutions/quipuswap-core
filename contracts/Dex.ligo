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
    s.ethPool := amount / 1mutez;
    s.invariant := s.ethPool * s.tokenPool;
    s.shares[sender] := 1000n;
    s.totalShares := 1000n;
    s.init := True;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokenAmount);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
 } with (operations, s)

function ethToToken (const buyer : address; const recipient : address; const this : address; const ethIn : nat; const minTokensOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {

    if ethIn > 0n then skip else failwith("Wrong ethIn");
    if minTokensOut > 0n then skip else failwith("Wrong minTokensOut");

    const fee : nat = ethIn / s.feeRate;
    const newEthPool : nat = s.ethPool + ethIn;
    const tempEthPool : nat = abs(newEthPool - fee);
    const newTokenPool : nat = s.invariant / tempEthPool;
    const tokensOut : nat = s.tokenPool / newTokenPool;

    if tokensOut >= minTokensOut then skip else failwith("Wrong minTokensOut");
    if tokensOut <= s.tokenPool then skip else failwith("Wrong tokenPool");
    
    s.ethPool := newEthPool;
    s.tokenPool := newTokenPool;
    s.invariant := newEthPool * newTokenPool;
    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(this, recipient, tokensOut);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
 } with (operations, s)

function tokenToEth (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minEthOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minEthOut > 0n then skip else failwith("Wrong minEthOut");

    const fee : nat = tokensIn / s.feeRate;
    const newTokenPool : nat = s.tokenPool + tokensIn;
    const tempTokenPool : nat = abs(newTokenPool - fee);
    const newEthPool : nat = s.invariant / tempTokenPool;
    const ethOut : nat = s.ethPool / newEthPool;

    if ethOut >= minEthOut then skip else failwith("Wrong minEthOut");
    if ethOut <= s.ethPool then skip else failwith("Wrong ethPool");
    
    s.tokenPool := newTokenPool;
    s.ethPool := newEthPool;
    s.invariant := newEthPool * newTokenPool;
    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(buyer, this, tokensIn); 

    const receiver: contract(unit) = get_contract(recipient);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(unit, ethOut * 1mutez, receiver); end;
 } with (operations, s)

function tokenToTokenOut (const buyer : address; const recipient : address; const this : address; const tokensIn : nat; const minTokensOut : nat; const tokenOutAddress: address; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
    if tokensIn > 0n then skip else failwith("Wrong tokensIn");
    if minTokensOut > 0n then skip else failwith("Wrong minEthOut");

    const fee : nat = tokensIn / s.feeRate;
    const newTokenPool : nat = s.tokenPool + tokensIn;
    const tempTokenPool : nat = abs(newTokenPool - fee);
    const newEthPool : nat = s.invariant / tempTokenPool;
    const ethOut : nat = s.ethPool / newEthPool;

    if ethOut <= s.ethPool then skip else failwith("Wrong ethPool");

    s.tokenPool := newTokenPool;
    s.ethPool := newEthPool;
    s.invariant := newEthPool * newTokenPool;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(buyer, this, tokensIn);

    const factoryContract: contract(exchangeAction) = get_contract(s.factoryAddress);
    const receiver: contract(dexAction) = get_contract(this);
    const requestParams: exchangeAction = TokenToExchangeLookup(tokenOutAddress, recipient, minTokensOut);

    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(requestParams, ethOut * 1mutez, factoryContract); end;
 } with (operations, s)

function tokenToTokenIn (const recipient : address; const this : address; const minTokensOut : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
 block {
   if sender = s.factoryAddress then skip else failwith("Wrong minEthOut");
 } with ethToToken(sender, recipient, this, amount / 1mutez, minTokensOut, s)


function investLiquidity (const minShares : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
block {
    if amount > 0mutez then skip else failwith("Wrong amount");
    if minShares > 0n then skip else failwith("Wrong tokenAmount");
    const ethPerShare : nat = s.ethPool / s.totalShares;
    if amount >= ethPerShare * 1mutez then skip else failwith("Wrong ethPerShare");
    const sharesPurchased : nat = (amount / 1mutez) / ethPerShare;
    if sharesPurchased >= minShares then skip else failwith("Wrong sharesPurchased");
    
    const tokensPerShare : nat = s.tokenPool / s.totalShares;
    const tokensRequired : nat = sharesPurchased * tokensPerShare;
    const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;
    s.shares[sender] := share + sharesPurchased;
    s.ethPool := s.ethPool + amount / 1mutez;
    s.tokenPool := s.tokenPool + tokensRequired;
    s.invariant := s.ethPool * s.tokenPool;

    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(sender, self_address, tokensRequired);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); end;
 } with (operations, s)

function divestLiquidity (const sharesBurned : nat; const minEth : nat; const minTokens : nat; var s: dex_storage ) :  (list(operation) * dex_storage) is
block {
    if sharesBurned > 0n then skip else failwith("Wrong sharesBurned");
    const share : nat = case s.shares[sender] of | None -> 0n | Some(share) -> share end;
    if sharesBurned > share then failwith ("Snder shares are too low") else skip;
    s.shares[sender] := abs(share - sharesBurned);

    const ethPerShare : nat = s.ethPool / s.totalShares;
    const tokensPerShare : nat = s.tokenPool / s.totalShares;
    const ethDivested : nat = ethPerShare * sharesBurned;
    const tokensDivested : nat = tokensPerShare * sharesBurned;

    if ethDivested >= minEth then skip else failwith("Wrong minEth");
    if tokensDivested >= minTokens then skip else failwith("Wrong minTokens");

    s.totalShares := abs(s.totalShares - sharesBurned);
    s.ethPool := abs(s.ethPool - ethDivested);
    s.tokenPool := abs(s.tokenPool - tokensDivested);
    s.invariant := if s.totalShares = 0n then 0n; else s.ethPool * s.tokenPool;
    const tokenContract: contract(tokenAction) = get_contract(s.tokenAddress);
    const transferParams: tokenAction = Transfer(self_address, sender, tokensDivested);

    const receiver: contract(unit) = get_contract(sender);
    const operations : list(operation) = list transaction(transferParams, 0mutez, tokenContract); transaction(unit, ethDivested * 1mutez, receiver); end;
 } with (operations, s)

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | InitializeExchange(n) -> initializeExchange(n, s)
  | EthToTokenSwap(n) -> ethToToken(sender, sender, this, amount / 1mutez, n, s)
  | TokenToEthSwap(n) -> tokenToEth(sender, sender, this, n.0, n.1, s)
  | TokenToTokenSwap(n) -> tokenToTokenOut(sender, sender, this, n.0, n.1, n.2, s)
  | EthToTokenPayment(n) -> ethToToken(sender, n.1, this, amount / 1mutez, n.0, s)
  | TokenToEthPayment(n) -> tokenToEth(sender, n.2, this, n.0, n.1, s)
  | TokenToTokenPayment(n) -> tokenToTokenOut(sender, n.2, this, n.0, n.1, n.3, s)
  | TokenToTokenIn(n) -> tokenToTokenIn(n.1, this, n.0, s)
  | InvestLiquidity(n) -> investLiquidity(n, s)
  | DivestLiquidity(n) -> divestLiquidity(n.0, n.1, n.2, s)
 end

// TODO: 
// - replace map with big_map