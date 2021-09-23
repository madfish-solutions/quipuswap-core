#include "../partials/IDex.ligo"
#include "../partials/Utils.ligo"
#include "../partials/MethodFA2.ligo"
#include "../partials/MethodDex.ligo"
#include "../partials/Dex.ligo"

(* Dex - Contract for exchanges between FA12 and FA2 tokens *)
function main(
  const p               : full_action_type;
  const s               : full_storage_type)
                        : full_return_type is
  case p of
    Use(params)                -> call_dex(params, s)
  | Transfer(params)           -> call_token(ITransfer(params), 0n, s)
  | Balance_of(params)         -> call_token(IBalance_of(params), 2n, s)
  | Update_operators(params)   -> call_token(IUpdate_operators(params), 1n, s)
  | Get_reserves(params)       -> get_reserves(params, s)
  | Close                      -> ((nil:list(operation)), close(s))
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
