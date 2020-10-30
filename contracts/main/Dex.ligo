#include "../partials/IDex.ligo"

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

function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address; 
  } with case p of
      | Default -> use_default(s) 
      | Use(params) -> middle_dex(params.1, this, params.0, s) 
      | Transfer(params) -> middle_token(ITransfer(params), 0n, s)
      | Approve(params) -> middle_token(IApprove(params), 1n, s)
      | GetBalance(params) -> middle_token(IGetBalance(params), 2n, s)
      | GetAllowance(params) -> middle_token(IGetAllowance(params), 3n, s)
      | GetTotalSupply(params) -> middle_token(IGetTotalSupply(params), 4n, s)
    end
