#include "IDex.ligo"

function middle (const p : dexAction ; const this: address; const idx: nat; const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
block {
  const res : (list(operation) * dex_storage) = case s.lambdas[idx] of 
    Some(f) -> f(p, s.storage, this) 
    | None -> (failwith("Dex/function-not-set"): (list(operation) * dex_storage)) 
  end;
  s.storage := res.1;
} with (res.0, s)

function useDefault (const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
block {
  const res : (list(operation) * dex_storage) = case s.lambdas[9n] of 
    Some(f) -> f(InitializeExchange(0n), s.storage, Tezos.self_address)
    | None -> (failwith("Dex/function-not-set"): (list(operation) * dex_storage)) 
  end;
  s.storage := res.1;
} with (res.0, s)

function main (const p : fullAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
  block {
     const this: address = self_address; 
  } with case p of
      | Default -> useDefault(s) 
      | Use(n) -> middle(n.1, this, n.0, s) 
    end
