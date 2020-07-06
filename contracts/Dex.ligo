#include "IDex.ligo"

function middle (const p : dexAction ; const this: address; const idx: nat; const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(idx, s.lambdas);
    const res : (list(operation) * dex_storage) = f(p, s.storage, this);
    s.storage := res.1;
 } with (res.0, s)

function useDefault (const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(9n, s.lambdas);
    const res : (list(operation) * dex_storage) = f(InitializeExchange(0n), s.storage, Tezos.self_address);
    s.storage := res.1;
 } with (res.0, s)



function setSettings (const m: big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)) ;const s : full_dex_storage) : full_dex_storage is
 block {
    if Tezos.sender =/= s.storage.factoryAddress then failwith("Dex/not-permitted") else skip;
    s.lambdas := m;
 } with s

function main (const p : fullAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | Default -> useDefault(s) 
  | Use(n) -> middle(n.1, this, n.0, s) 
  | SetSettings(n) -> ((nil:list(operation)), setSettings(n, s))
 end

