#include "IFactory.ligo"
#include "IDex.ligo"

function launchExchange (const token : address; const exchange : address; var s: exchange_storage ) :  (exchange_storage) is
 block {
    if s.tokenList contains token then failwith("Exchange launched") else skip;
    case s.exchangeToToken[exchange] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    s.tokenList := Set.add (token, s.tokenList);
    s.tokenToExchange[token] := exchange;
    s.exchangeToToken[exchange] := token;
 } with (s)

function tokenToExchangeLookup (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : exchange_storage) :  list(operation) is
 list transaction(TezToTokenPayment(minTokensOut, recipient), Tezos.amount, (get_contract(get_force(tokenOutAddress, s.tokenToExchange)): contract(dexAction))); end

function main (const p : exchangeAction ; const s : exchange_storage) :
  (list(operation) * exchange_storage) is
 block {
    const this: address = self_address; 
 } with case p of
    LaunchExchange(n) -> ((nil: list(operation)), launchExchange(n.0, n.1,s))
  | TokenToExchangeLookup(n) -> (tokenToExchangeLookup(n.0, n.1, n.2, s), s)
 end
