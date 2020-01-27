#include "IDex.ligo"

type exchange_storage is record 
   tokenList: list (address);
   tokenToExchange: map(address, address);
   exchangeToToken: map(address, address);
end

type exchangeAction is
| LaunchExchange of (address * address)
| TokenToExchangeLookup of (address * address * nat)
