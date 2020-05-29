#include "IFactory.ligo"

function launchExchange (const token : address; const exchange : address; var s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    case s.tokenToExchange[token] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    case s.exchangeToToken[exchange] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    s.tokenList := cons(token, s.tokenList);
    s.tokenToExchange[token] := exchange;
    s.exchangeToToken[exchange] := token;
 } with ( (nil : list(operation)), s)

function tokenToExchangeLookup (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : exchange_storage) :  list(operation) is
 list transaction(TezToTokenPayment(minTokensOut, recipient), Tezos.amount, (get_contract(get_force(tokenOutAddress, s.tokenToExchange)): contract(dexAction))); end

function main (const p : exchangeAction ; const s : exchange_storage) :
  (list(operation) * exchange_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | LaunchExchange(n) -> launchExchange(n.0, n.1, s)
  | TokenToExchangeLookup(n) -> (tokenToExchangeLookup(n.0, n.1, n.2, s), s)
 end
