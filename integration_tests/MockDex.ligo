(* the same dex as in contracts but with all methods in place since there is no need to battle gas limits *)

#define FA2_STANDARD_ENABLED

#include "../contracts/partials/IFactory.ligo"
#include "../contracts/partials/Common.ligo"
#include "../contracts/partials/MethodDex.ligo"
#include "../contracts/partials/MethodFA2.ligo"

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
    | InitializeExchange(n) -> initialize_exchange(p, s.storage, this)
    | TezToTokenPayment(n) -> tez_to_token(p, s.storage, this)
    | TokenToTezPayment(n) -> token_to_tez(p, s.storage, this)
    | InvestLiquidity(n) -> invest_liquidity(p, s.storage, this)
    | DivestLiquidity(n) -> divest_liquidity(p, s.storage, this)
    | Vote(n) -> vote(p, s.storage, this)
    | Veto(voter) -> veto(p, s.storage, this)
    | WithdrawProfit(receiver) -> withdraw_profit(p, s.storage, this)
  end;
  s.storage := res.1;
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
    | ITransfer(n) -> transfer(p, s.storage, this)
    | IBalance_of(n) -> get_balance_of(p, s.storage, this)
    | IUpdate_operators(n) -> update_operators(p, s.storage, this)
  end;
  s.storage := res.1;
} with (res.0, s)

(* Route the simple XTZ transfers

Due to the fabulous storage, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

*)
[@inline] function use_default (const s : full_dex_storage) : full_return is
block {
  const res: return = receive_reward(InitializeExchange(0n), s.storage, Tezos.self_address);
  s.storage := res.1;
} with (res.0, s)


(* Return the reserves to the contracts. *)
[@inline] function get_reserves (const receiver : contract(nat * nat); const s : full_dex_storage) : full_return is
  (list [
    Tezos.transaction((
      s.storage.tez_pool,
      s.storage.token_pool),
    0tez,
    receiver)
  ], s)

(* DexFA2 - Contract for exchanges for XTZ - FA2 token pair *)
function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address;
  } with case p of
      | Default                           -> use_default(s)
      | Use(params)                       -> call_dex(params, this, s)
      | Transfer(params)                  -> call_token(ITransfer(params), this, 0n, s)
      | Balance_of(params)                -> call_token(IBalance_of(params), this, 2n, s)
      | Update_operators(params)          -> call_token(IUpdate_operators(params), this, 1n, s)
      | Get_reserves(params)              -> get_reserves(params, s)
    end