#include "../partials/Dex.ligo"

(* DexFA12 - Contract for exchanges for XTZ - FA1.2 token pair *)
function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address;
  } with case p of
      | Default                   -> use_default(s)
      | Use(params)               -> call_dex(params, this, s)
      | Transfer(params)          -> call_token(ITransfer(params), this, 0n, s)
      | Approve(params)           -> call_token(IApprove(params), this, 1n, s)
      | GetBalance(params)        -> call_token(IGetBalance(params), this, 2n, s)
      | GetAllowance(params)      -> call_token(IGetAllowance(params), this, 3n, s)
      | GetTotalSupply(params)    -> call_token(IGetTotalSupply(params), this, 4n, s)
      | GetReserves(params)       -> get_reserves(params, s)
    end
