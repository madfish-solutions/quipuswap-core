#include "IDex.ligo"

type exchange_storage is record 
   tokenList: list (address);
   tokenToExchange: map(address, address);
   exchangeToToken: map(address, address);
end

type exchangeAction is
| LaunchExchange of address
| TokenToExchangeLookup of address
| ExchangeToTokenLookup of address

function launchExchange (const token : address; const exchange : address; var s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    case s.tokenToExchange[token] of | None -> 0n | Some(t) -> failwith("Exchange launched"); end;
    case s.exchangeToToken[exchange] of | None -> 0n | Some(t) -> failwith("Exchange launched"); end;
    s.tokenList := cons(token, s.tokenList);
    s.tokenToExchange[token] := exchange;
    s.exchangeToToken[exchange] := token;
 } with ( (nil : list(operation)), s)

function tokenToExchangeLookup (const token : address; const receiver: contract(dexAction); const s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    const transferParams: tokenAction = TokenToExchangeResponse(get_force(s.tokenToExchange, token));
    const operations : list(operation) = list transaction(transferParams, 0mutez, receiver); end;
 } with (operations, s)

function exchangeToTokenLookup (const exchange : address; const receiver: contract(dexAction); const s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    const transferParams: tokenAction = ExchangeToTokenResponse(get_force(s.exchangeToToken, exchange));
    const operations : list(operation) = list transaction(transferParams, 0mutez, receiver); end;
 } with (operations, s)

function main (const p : exchangeAction ; const s : exchange_storage) :
  (list(operation) * exchange_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | LaunchExchange(n) -> launchExchange(n, s)
  | TokenToExchangeLookup(n) -> tokenToExchangeLookup(n.0, n.1, s)
  | ExchangeToTokenLookup(n) -> exchangeToTokenLookup(n.0, n.1, s)
 end

// TODO: 
// - replace map with big_map
