#include "../partials/IDex.ligo"
#include "../partials/MethodDex.ligo"
#include "../partials/Dex.ligo"

(* DexFA2 - Contract for exchanges for XTZ - FA2 token pair *)
function main(
  const p               : full_action_type;
  const s               : full_storage_type)
                        : full_return_type is
  block {
     const this: address = Tezos.self_address;
  } with case p of
      | Use(params)                       -> call_dex(params, this, s)
      | Transfer(params)                  -> call_token(ITransfer(params), this, 0n, s)
      | Balance_of(params)                -> call_token(IBalance_of(params), this, 2n, s)
      | Update_operators(params)          -> call_token(IUpdate_operators(params), this, 1n, s)
      | BalanceAFA12(params)              -> call_balance(IBalanceAFA12(params), this, 0n, s)
      | BalanceBFA12(params)              -> call_balance(IBalanceBFA12(params), this, 1n, s)
      | BalanceAFA2(params)               -> call_balance(IBalanceAFA2(params), this, 2n, s)
      | BalanceBFA2(params)               -> call_balance(IBalanceBFA2(params), this, 3n, s)
      | Get_reserves(params)              -> get_reserves(params, s)
      | Close                             -> ((nil:list(operation)), close(s))
      | SetBalanceFunction(params)        ->
        ((nil:list(operation)),
          if params.index > bal_func_count
          then (failwith("Dex/wrong-index") : full_storage_type)
          else set_balance_function(params.index, params.func, s))
      | SetDexFunction(params)            ->
        ((nil:list(operation)),
          if params.index > dex_func_count
          then (failwith("Dex/wrong-index") : full_storage_type)
          else set_dex_function(params.index, params.func, s))
      | SetTokenFunction(params)          ->
        ((nil:list(operation)),
          if params.index > token_func_count
          then (failwith("Dex/wrong-index") : full_storage_type)
          else set_token_function(params.index, params.func, s))
    end
