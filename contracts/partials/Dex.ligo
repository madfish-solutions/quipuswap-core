(*

The function is responsible for fiding the appropriate method
based on the argument type.

*)
[@inline]
function call_dex(
  const p               : action_type;
  var s                 : full_storage_type)
                        : full_return_type is
  block {
    s.storage.entered := check_reentrancy(s.storage.entered);

    const idx : nat = case p of
      AddPair(_)          -> 0n
    | Swap(_)             -> 1n
    | Invest(_)           -> 2n
    | Divest(_)           -> 3n
    end;
    const prev_pairs_count : nat = s.storage.pairs_count;
    var res : return_type :=
      case s.dex_lambdas[idx] of
        Some(f)           -> f(p, s.storage)
      | None              -> (failwith(err_unknown_func) : return_type)
      end;
    s.storage := res.1;
    if prev_pairs_count =/= s.storage.pairs_count
    then s.token_metadata[prev_pairs_count] := record[
        token_id    = prev_pairs_count;
        token_info  = default_pool_metadata
      ]
    else skip;
} with (res.0, s)

(*

The function is responsible for fiding the appropriate method
based on the provided index.

*)
[@inline]
function call_token(
  const p               : token_action_type;
  const idx             : nat;
  var s                 : full_storage_type)
                        : full_return_type is
  block {
    const res : return_type =
      case s.token_lambdas[idx] of
        Some(f) -> f(p, s.storage)
      | None -> (failwith(err_unknown_func) : return_type)
      end;
    s.storage := res.1;
  } with (res.0, s)

[@inline]
function close(
  var s                 : full_storage_type)
                        : full_storage_type is
  block {
    assert_with_error(
      s.storage.entered,
      err_not_entered);
    assert_with_error(
      Tezos.sender = Tezos.self_address,
      err_sender_not_self);
    s.storage.entered := False;
  } with s

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
