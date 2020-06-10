#include "IToken.ligo"
#include "IFactory.ligo"
#include "IDoubleCall.ligo"

function initializeExchangeMiddle (const this : address; const tokenAmount : nat; var s: full_dex_storage ) :  (list(operation) * full_dex_storage) is
 block {
    const f: (address * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(0n, s.initializeInvest);
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
    const f: (address * nat * dex_storage) -> (list(operation) * dex_storage) = get_force(1n, s.initializeInvest);
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
  // comment me to fix compilation:
  | TezToTokenSwap(n) -> tezToTokenMiddle(Tezos.sender, this, amount / 1mutez, n, s) 
  | TokenToTezSwap(n) -> tokenToTezMiddle(Tezos.sender, Tezos.sender, this, n.0, n.1, s) 
  | TokenToTokenSwap(n) -> tokenToTokenOutMiddle(Tezos.sender, Tezos.sender, this, n.0, n.1, n.2, s)
  //   
  | TezToTokenPayment(n) -> tezToTokenMiddle(n.1, this, amount / 1mutez, n.0, s)
  | TokenToTezPayment(n) -> tokenToTezMiddle(Tezos.sender, n.2, this, n.0, n.1, s)
  | TokenToTokenPayment(n) -> tokenToTokenOutMiddle(Tezos.sender, n.2, this, n.0, n.1, n.3, s)
  | InvestLiquidity(n) -> investLiquidityMiddle(this, n, s)
  | DivestLiquidity(n) -> divestLiquidityMiddle(this, n.0, n.1, n.2, s) 
  | SetVotesDelegation(n) -> ((nil: list(operation)), setVotesDelegationMiddle(n.0, n.1, s))
  | Vote(n) -> voteMiddle(n.0, n.1, s)
  | Veto(n) -> vetoMiddle(n, s) 
 end
