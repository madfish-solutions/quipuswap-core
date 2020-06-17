#include "IDex.ligo"
#include "IToken.ligo"
#include "IFactory.ligo"

type x is ReceiveDexStorage of dex_storage

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
   if get_force(Tezos.sender, s.allowed) then skip else failwith ("Not permitted");
 } with case p of
  | GetStorage -> (list transaction(ReceiveDexStorage(s), 
  Tezos.amount, 
  case (Tezos.get_entrypoint_opt("%receiveDexStorage", Tezos.sender) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
   )
  end, s) 
  | UpdateStorage(n) -> ((nil: list(operation)), n) 
  | RequestOperation(n) -> (list set_delegate(n); end, s) 
  | RequestTransfer(n) -> (list if n.2 then transaction(unit, n.1 * 1mutez, (get_contract(n.0) : contract(unit))) else transaction(Transfer(Tezos.self_address, n.0, n.1), 0mutez, (get_contract(s.tokenAddress): contract(tokenAction))); end, s) 
  | Lookup(n) -> (list transaction(TokenToExchangeLookup(n.0, n.1, n.2), n.3 * 1mutez, (get_contract(s.factoryAddress): contract(exchangeAction))); end, s) 

//   | Default(n) -> ((nil: list(operation)), s) 
 end

// | TokenToTokenPayment of (nat * nat * address * address)

// | Default of (unit)
