#include "IFactory.ligo"

function launchExchange (const token : address; const exchange : address; var s: exchange_storage ) :  (exchange_storage) is
 block {
    case s.tokenToExchange[token] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    case s.exchangeToToken[exchange] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    s.tokenList := cons(token, s.tokenList);
    s.tokenToExchange[token] := exchange;
    s.exchangeToToken[exchange] := token;
 } with (s)

function tokenToExchangeLookup (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : exchange_storage) :  list(operation) is
 list transaction(TezToTokenPayment(minTokensOut, recipient), Tezos.amount, (get_contract(get_force(tokenOutAddress, s.tokenToExchange)): contract(dexAction))); end

function launchExchangeMiddle (const token : address; const exchange : address; const s : full_exchange_storage) :  (full_exchange_storage)  is
 block {
    const f: (address * address * exchange_storage) -> (exchange_storage) = get_force(0n, s.launchExchange);
    s.storage := f(token, exchange, s.storage);
 } with (s)

function tokenToExchangeLookupMiddle (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : full_exchange_storage) :  (list(operation))  is
 block {
    const f: (address * address * nat * exchange_storage) -> (list(operation)) = get_force(0n, s.tokenToExchangeLookup);
 } with f(tokenOutAddress, recipient, minTokensOut, s.storage)

function main (const p : exchangeAction ; const s : full_exchange_storage) :
  (list(operation) * full_exchange_storage) is
 block {
    const this: address = self_address; 
 } with case p of
    LaunchExchange(n) -> ((nil: list(operation)), launchExchangeMiddle(n.0, n.1,s))
  | TokenToExchangeLookup(n) -> (tokenToExchangeLookupMiddle(n.0, n.1, n.2, s), s)
 end

// const initial_storage : full_exchange_storage = 
// record
//    storage = record 
//       tokenList = (nil : list(address));
//       tokenToExchange = (big_map end : big_map(address, address));
//       exchangeToToken = (big_map end : big_map(address, address));
//    end;
//    tokenToExchangeLookup = big_map[0n -> tokenToExchangeLookup];
//    launchExchange = big_map[0n -> launchExchange];
// end;

// record   storage = record       tokenList = (nil : list(address));      tokenToExchange = (big_map end : big_map(address, address));      exchangeToToken = (big_map end : big_map(address, address));   end;   tokenToExchangeLookup = big_map[0n -> tokenToExchangeLookup];   launchExchange = big_map[0n -> launchExchange];end;