#include "IDex.ligo"

type exchange_storage is record 
   tokenList: list (address);
   tokenToExchange: big_map(address, address);
   exchangeToToken: big_map(address, address);
end

type full_exchange_storage is record 
   storage: exchange_storage;
   launchExchange: big_map(nat, (address * address * exchange_storage) -> (exchange_storage));
   tokenToExchangeLookup: big_map(nat, (address * address * nat * exchange_storage) -> (list(operation)));
end

type exchangeAction is
| LaunchExchange of (address * address)
| TokenToExchangeLookup of (address * address * nat)
