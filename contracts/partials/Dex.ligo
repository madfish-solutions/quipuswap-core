#include "./IDex.ligo"

function middle_dex (const p : dex_action; const this : address; const idx : nat; const s : full_dex_storage) :  full_return is
block {
  const res : return = case s.dex_lambdas[idx] of 
    Some(f) -> f(p, s.storage, this) 
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)

function middle_token (const p : token_action; const idx : nat; const s : full_dex_storage) :  full_return is
block {
  const res : return = case s.token_lambdas[idx] of 
    Some(f) -> f(p, s.storage) 
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)

function use_default (const s : full_dex_storage) : full_return is
block {
  const res : return = case s.dex_lambdas[8n] of 
    Some(f) -> f(InitializeExchange(0n), s.storage, Tezos.self_address)
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)
