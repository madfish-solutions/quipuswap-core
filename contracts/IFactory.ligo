#include "IDex.ligo"

type exchange_storage is record 
   tokenList: list (address);
   tokenToExchange: big_map(address, address);
   exchangeToToken: big_map(address, address);
end

type exchangeAction is
| LaunchExchange of (address * address)
| TokenToExchangeLookup of (address * address * nat)
