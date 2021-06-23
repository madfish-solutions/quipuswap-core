(* the same dex as in contracts but with all methods in place since there is no need to battle gas limits *)

#define FA2_STANDARD_ENABLED

#include "../contracts/partials/ITTDex.ligo"
#include "../contracts/partials/TTMethodDex.ligo"
#include "../contracts/partials/TTMethodFA2.ligo"


(* Route exchange-specific action

Due to the fabulous storage, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

The function is responsible for fiding the appropriate method
based on the argument type.

*)
[@inline] function call_dex (const p : dex_action; const this : address; const s : full_dex_storage) :  full_return is
block {
  const res : return = case p of
    | AddPair(_) -> initialize_exchange(p, s.storage, this)
    | Swap(_) -> token_to_token_route(p, s.storage, this)
    | Invest(_) -> invest_liquidity(p, s.storage, this)
    | Divest(_) -> divest_liquidity(p, s.storage, this)
  end;
  s.storage := res.1;
  res.0 := Tezos.transaction(
    unit,
    0mutez,
    get_close_entrypoint(this)) # res.0;
} with (res.0, s)

(* Route token-specific action

Due to the fabulous storage, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

The function is responsible for fiding the appropriate method
based on the provided index.

*)
[@inline] function call_token (const p : token_action; const this : address; const idx : nat; const s : full_dex_storage) :  full_return is
block {
  const res : return = case p of
    | ITransfer(_) -> transfer(p, s.storage, this)
    | IBalance_of(_) -> get_balance_of(p, s.storage, this)
    | IUpdate_operators(_) -> update_operators(p, s.storage, this)
  end;
  s.storage := res.1;
} with (res.0, s)

(* Return the reserves to the contracts. *)
[@inline] function get_reserves (const params : get_reserves_params; const s : full_dex_storage) : full_return is
block {
  const pair : pair_info = case s.storage.pairs[params.pair_id] of
    None -> record [
      token_a_pool    = 0n;
      token_b_pool    = 0n;
      total_supply    = 0n;
    ]
  | Some(instance) -> instance
  end;
} with (list [
    Tezos.transaction((
      pair.token_a_pool,
      pair.token_b_pool),
    0tez,
    params.receiver)
  ], s)

[@inline] function close (const s : full_dex_storage) :  full_dex_storage is
block {
  if not s.storage.entered then
    failwith("Dex/not-entered")
  else skip;
  if Tezos.sender =/= Tezos.self_address then
    failwith("Dex/not-self")
  else skip;
  s.storage.entered := False;
} with s


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
      
      (* do nothing for mock *)
      | SetDexFunction(params)            -> ((nil:list(operation)), s)
      | SetTokenFunction(params)          -> ((nil:list(operation)), s)
    end