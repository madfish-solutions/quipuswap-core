#include "IToken.ligo"
#include "IFactory.ligo"

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
 begin
  if Tezos.sender = voter then skip;
  else block {
    const src: vote_info = get_force(Tezos.sender, s.voters);
    src.allowances[voter] := allowance;
    s.voters[Tezos.sender] := src;
  }
 end with s

function redelegate (const voter : address; const candidate : key_hash; const prevShare : nat; const share : nat; var s: dex_storage ) :  (option(operation) * dex_storage) is
 block {
    case isAllowedVoter(voter, s) of 
    | False -> failwith ("Sender not allowed to spend token from source")
    | True -> skip
    end;

    const voterInfo : vote_info = record allowances = (map end : map(address, bool)); candidate = candidate; end;
    case s.voters[voter] of None -> skip
      | Some(v) -> {
        s.votes[v.candidate]:= abs(get_force(v.candidate, s.votes) - prevShare);
        v.candidate := candidate;
        voterInfo := v;
      }
      end;    
    s.voters[voter]:= voterInfo;
    const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share;
    s.votes[candidate]:= newVotes;

    var operations: option(operation) := None;
    if (case s.votes[s.delegated] of None -> 0n | Some(v) -> v end) > newVotes then skip else {
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
      const redelegateRes : (option(operation) * dex_storage) = redelegate (Tezos.sender, v.candidate, share, share + sharesPurchased, s);
      s := redelegateRes.1;
      case redelegateRes.0 of None -> skip 
      | Some(o) -> {
         operations := o # operations;
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
     const prevVotes: nat = get_force(v.candidate, s.votes);
     s.votes[v.candidate]:= abs(prevVotes - sharesBurned);
     if prevVotes = sharesBurned then remove Tezos.sender from map s.voters; else skip;
   } end;

 } with (list transaction(Transfer(this, sender, tokensDivested), 0mutez, (get_contract(s.tokenAddress) : contract(tokenAction))); transaction(unit, tezDivested * 1mutez, (get_contract(sender) : contract(unit))); end, s)

const initialize_exchange : big_map(nat, (address * nat * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> initializeExchange];
const tez_to_token : big_map(nat, (address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> tezToToken];
const token_to_tez : big_map(nat, (address * address * address * nat * nat * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> tokenToTez];
const token_to_token_out : big_map(nat, (address * address * address * nat * nat * address * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> tokenToTokenOut];
const invest_liquidity : big_map(nat, (address * nat * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> investLiquidity];
const divest_liquidity : big_map(nat, (address * nat * nat * nat * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> divestLiquidity];
const set_votes_delegation : big_map(nat, (address * bool * dex_storage) -> (dex_storage)) = big_map[0n -> setVotesDelegation];
const vote : big_map(nat, (address * key_hash * dex_storage) -> (list(operation) * dex_storage)) = big_map[0n -> vote];

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | InitializeExchange(n) -> case initialize_exchange[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(this, n, s) end
  | TezToTokenSwap(n) -> case tez_to_token[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(sender, this, amount / 1mutez, n, s) end
  | TokenToTezSwap(n) -> case token_to_tez[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(sender, sender, this, n.0, n.1, s) end
  | TokenToTokenSwap(n) -> case token_to_token_out[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(sender, sender, this, n.0, n.1, n.2, s) end
  | TezToTokenPayment(n) -> case tez_to_token[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(n.1, this, amount / 1mutez, n.0, s) end
  | TokenToTezPayment(n) -> case token_to_tez[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(sender, n.2, this, n.0, n.1, s) end
  | TokenToTokenPayment(n) -> case token_to_token_out[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(sender, n.2, this, n.0, n.1, n.3, s) end
  | InvestLiquidity(n) -> case invest_liquidity[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(this, n, s) end
  | DivestLiquidity(n) -> case divest_liquidity[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(this, n.0, n.1, n.2, s) end 
  | SetVotesDelegation(n) -> case set_votes_delegation[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> ((nil: list(operation)), f(n.0, n.1, s)) end
  | Vote(n) -> case vote[0n] of None -> (failwith("Error"):(list(operation) * dex_storage)) | Some(f) -> f(n.0, n.1, s) end 
 end
