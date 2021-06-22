(* Route exchange-specific action

Due to the fabulous storage, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

The function is responsible for fiding the appropriate method
based on the argument type.

*)
[@inline] function call_dex(
  const p : dex_action;
  const this : address;
  const s : full_dex_storage) : full_return is
block {
    const idx : nat = case p of
      | InitializeExchange(n) -> 0n
      | TokenToTokenRoutePayment(n) -> 1n
      | InvestLiquidity(n) -> 2n
      | DivestLiquidity(n) -> 3n
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
[@inline] function call_token(
  const p : token_action;
  const this : address;
  const idx : nat;
  const s : full_dex_storage) : full_return is
block {
  const res : return = case s.token_lambdas[idx] of
    Some(f) -> f(p, s.storage, this)
    | None -> (failwith("Dex/function-not-set") : return)
  end;
  s.storage := res.1;
  res.0 := Tezos.transaction(
      unit,
      0mutez,
      get_close_entrypoint(this)) # res.0;
} with (res.0, s)

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

(* Return the reserves to the contracts. *)
[@inline] function get_reserves(
  const params : get_reserves_params;
  const s : full_dex_storage) : full_return is
block {
  const pair : pair_info = case s.storage.pairs[params.token_id] of
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

(* Set the dex function code to factory storage *)
[@inline] function set_dex_function(
  const idx : nat;
  const f : dex_func;
  const s : full_dex_storage) : full_dex_storage is
block {
  case s.dex_lambdas[idx] of
    Some(n) -> failwith("Dex/function-set")
    | None -> s.dex_lambdas[idx] := f
  end;
} with s

(* Set the token function code to factory storage *)
[@inline] function set_token_function(
  const idx : nat;
  const f : token_func;
  const s : full_dex_storage) : full_dex_storage is
block {
  case s.token_lambdas[idx] of
    Some(n) -> failwith("Dex/function-set")
    | None -> s.token_lambdas[idx] := f
  end;
} with s