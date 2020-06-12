#include "IDex.ligo"

type gateway_storage is 
record
  main: address;
  tmp: (nat * nat * nat * address * address * bool * key_hash);
  // tmp: (nat);
end

type gatewayAction is
| ReceiveDexStorage of (dex_storage)
| Use of (nat * nat * nat * address * address * bool * key_hash)
// | Use of (nat)
// | SetMain of (address)
