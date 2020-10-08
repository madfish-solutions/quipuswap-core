#include "IDex.ligo"

function middleDex (const p : dexAction; const this : address; const idx : nat; const s : full_dex_storage) :  full_return is
block {
  const res : return = case s.dexLambdas[idx] of 
    Some(f) -> f(p, s.storage, this) 
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)

function middleToken (const p : tokenAction; const idx : nat; const s : full_dex_storage) :  full_return is
block {
  const res : return = case s.tokenLambdas[idx] of 
    Some(f) -> f(p, s.storage) 
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)

function useDefault (const s : full_dex_storage) : full_return is
block {
  const res : return = case s.dexLambdas[8n] of 
    Some(f) -> f(InitializeExchange(0n), s.storage, Tezos.self_address)
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
  s.storage := res.1;
} with (res.0, s)

function main (const p : fullAction; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address; 
  } with case p of
      | Default -> useDefault(s) 
      | Use(params) -> middleDex(params.1, this, params.0, s) 
      | Transfer(params) -> middleToken(ITransfer(params), 0n, s)
      | Approve(params) -> middleToken(IApprove(params), 1n, s)
      | GetBalance(params) -> middleToken(IGetBalance(params), 2n, s)
      | GetAllowance(params) -> middleToken(IGetAllowance(params), 3n, s)
      | GetTotalSupply(params) -> middleToken(IGetTotalSupply(params), 4n, s)
    end
