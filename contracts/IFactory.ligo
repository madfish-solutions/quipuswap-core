#include "IDex.ligo"

type exchange_storage is record 
   tokenList: set (address);
   tokenToExchange: big_map(address, address);
   exchangeToToken: big_map(address, address);
   lambdas: big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage));
end

type exchangeAction is
| LaunchExchange of (address)
| TokenToExchangeLookup of (address * address * nat)
| ConfigDex of (nat * address)
| SetFunction of (nat * ((dexAction * dex_storage * address) -> (list(operation) * dex_storage)))