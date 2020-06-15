#include "IFactory.ligo"

type x is Use of (nat * address)

function launchExchange (const token : address; const exchange : address; var s: exchange_storage ) : exchange_storage is
 block {
    case s.tokenToExchange[token] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    case s.exchangeToToken[exchange] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    s.tokenList := cons(token, s.tokenList);
    s.tokenToExchange[token] := exchange;
    s.exchangeToToken[exchange] := token;
 } with  s

function tokenToExchangeLookup (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : exchange_storage) :  list(operation) is
 list transaction(Use(minTokensOut, recipient), 
 Tezos.amount, 
 case (Tezos.get_entrypoint_opt("%use", get_force(tokenOutAddress, s.tokenToExchange)) : option(contract(x))) of Some(contr) -> contr
       | None -> (failwith("01"):contract(x))
       end
 )
 end

function main (const p : exchangeAction ; const s : exchange_storage) :
  (list(operation) * exchange_storage) is  case p of
  | LaunchExchange(n) -> ((nil : list(operation)), launchExchange(n.0, n.1, s))
  | TokenToExchangeLookup(n) -> (tokenToExchangeLookup(n.0, n.1, n.2, s), s)
 end
