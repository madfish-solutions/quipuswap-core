#define FA2_STANDARD_ENABLED
#define TOKEN_TO_TOKEN_ENABLED
#include "../partials/ITTDex.ligo"
#include "../partials/TTMethodDex.ligo"
#include "../partials/TTDex.ligo"

(* DexFA2 - Contract for exchanges for XTZ - FA2 token pair *)
function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address;
  } with case p of
      | Use(params)                       -> call_dex(params, this, s)
      | Transfer(params)                  -> call_token(ITransfer(params), this, 0n, s)
      | Balance_of(params)                -> call_token(IBalance_of(params), this, 2n, s)
      | Update_operators(params)          -> call_token(IUpdate_operators(params), this, 1n, s)
      | Get_reserves(params)              -> get_reserves(params, s)
      | Close                             -> ((nil:list(operation)), close(s))
      | SetDexFunction(params)            -> ((nil:list(operation)), if params.index > 10n then (failwith("Dex/wrong-index") : full_dex_storage) else set_dex_function(params.index, params.func, s))
      | SetTokenFunction(params)          -> ((nil:list(operation)), if params.index > 2n then (failwith("Dex/wrong-index") : full_dex_storage) else set_token_function(params.index, params.func, s))
    end
