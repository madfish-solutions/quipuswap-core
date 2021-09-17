[@inline]
function call_balance(
  const p               : bal_action_type;
  const idx             : nat;
  var s                 : full_storage_type)
                        : full_return_type is
  block {
    const res : return_type =
      case s.balance_lambdas[idx] of
        Some(f) -> f(p, s.storage)
      | None -> (failwith("Dex/function-not-set") : return_type)
      end;
    s.storage := res.1;
  } with (res.0, s)

(* Route exchange-specific action

Due to the fabulous storage_type, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

The function is responsible for fiding the appropriate method
based on the argument type.

*)
[@inline]
function call_dex(
  const p               : action_type;
  var s                 : full_storage_type)
                        : full_return_type is
  block {
    const idx : nat =
      case p of
        AddPair(_)        -> 0n
      | Swap(_)           -> 1n
      | Invest(_)         -> 2n
      | Divest(_)         -> 3n
      | EnsuredAddPair(_) -> 4n
      | EnsuredSwap(_)    -> 5n
      | EnsuredInvest(_)  -> 6n
      end;

    var res : return_type :=
      case s.dex_lambdas[idx] of
        Some(f)             -> f(p, s.storage)
      | None                -> (failwith("Dex/function-not-set") : return_type)
      end;
    s.storage := res.1;

    if idx > 2n
    then res.0 := Tezos.transaction(
      unit,
      0mutez,
      get_close_entrypoint(unit)) # res.0
    else skip;
  } with (res.0, s)

(* Route token-specific action

Due to the fabulous storage_type, gas and operation size limits
the only way to have all the nessary functions is to store
them in big_map and dispatch the exact function code before
the execution.

The function is responsible for fiding the appropriate method
based on the provided index.

*)
[@inline] function call_token(
  const p               : token_action_type;
  const idx             : nat;
  var s                 : full_storage_type)
                        : full_return_type is
  block {
    const res : return_type =
      case s.token_lambdas[idx] of
        Some(f) -> f(p, s.storage)
      | None -> (failwith("Dex/function-not-set") : return_type)
      end;
    s.storage := res.1;
  } with (res.0, s)

[@inline]
function close(
  var s                 : full_storage_type)
                        : full_storage_type is
  block {
    if not s.storage.entered
    then failwith("Dex/not-entered")
    else skip;
    if Tezos.sender =/= Tezos.self_address
    then failwith("Dex/not-self")
    else skip;
    s.storage.entered := False;
  } with s

(* Return the reserves to the contracts. *)
[@inline]
function get_reserves(
  const params          : reserves_type;
  const s               : full_storage_type)
                        : full_return_type is
  block {
    const pair : pair_type =
      case s.storage.pairs[params.pair_id] of
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

(* Set the dex function code to factory storage_type *)
[@inline]
function set_dex_function(
  const idx             : nat;
  const f               : dex_func_type;
  var s                 : full_storage_type)
                        : full_storage_type is
  block {
    case s.dex_lambdas[idx] of
      Some(_) -> failwith("Dex/function-set")
    | None -> s.dex_lambdas[idx] := f
    end;
  } with s

(* Set the token function code to factory storage_type *)
[@inline]
function set_token_function(
  const idx             : nat;
  const f               : token_func_type;
  var s                 : full_storage_type)
                        : full_storage_type is
  block {
    case s.token_lambdas[idx] of
      Some(_) -> failwith("Dex/function-set")
    | None -> s.token_lambdas[idx] := f
    end;
  } with s

(* Set the token function code to factory storage_type *)
[@inline]
function set_balance_function(
  const idx             : nat;
  const f               : bal_func_type;
  var s                 : full_storage_type)
                        : full_storage_type is
  block {
    case s.balance_lambdas[idx] of
      Some(_) -> failwith("Dex/function-set")
    | None -> s.balance_lambdas[idx] := f
    end;
  } with s