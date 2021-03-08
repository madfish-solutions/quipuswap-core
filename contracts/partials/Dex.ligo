#include "./IDex.ligo"

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
    const idx : nat = case p of
      | InitializeExchange(n) -> 0n
      | TezToTokenPayment(n) -> 1n
      | TokenToTezPayment(n) -> 2n
      | InvestLiquidity(n) -> 4n
      | DivestLiquidity(n) -> 5n
      | Vote(n) -> 6n
      | Veto(voter) -> 7n
      | WithdrawProfit(receiver) -> 3n
    end;
  const res : return = case s.dex_lambdas[idx] of 
    Some(f) -> f(p, s.storage, this) 
    | None -> (failwith("Dex/function-not-set") : return) 
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
  const res : return = case s.token_lambdas[idx] of 
    Some(f) -> f(p, s.storage, this) 
    | None -> (failwith("Dex/function-not-set") : return) 
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
  const res : return = case s.dex_lambdas[8n] of 
    Some(f) -> f(InitializeExchange(0n), s.storage, Tezos.self_address)
    | None -> (failwith("Dex/function-not-set") : return) 
  end;
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
