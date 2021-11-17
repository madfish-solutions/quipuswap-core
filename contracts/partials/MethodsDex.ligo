(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[
      Tezos.transaction(
        unit,
        0mutez,
        get_close_entrypoint(Tezos.self_address))
    ];
    case p of
      AddPair(params) -> {
        assert_with_error(
          params.pair.token_a_type < params.pair.token_b_type,
          err_wrong_pair_order);

        const res : (pair_type * nat) = get_pair_info(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        if s.pairs_count = token_id
        then {
          s.token_to_id[Bytes.pack(params.pair)] := token_id;
          s.pairs_count := s.pairs_count + 1n;
        }
        else skip;

        assert_with_error(
          params.token_a_in > 0n,
          err_zero_a_in);
        assert_with_error(
          params.token_b_in > 0n,
          err_zero_b_in);
        assert_with_error(
          pair.total_supply = 0n,
          err_pair_listed);

        pair.token_a_pool := params.token_a_in;
        pair.token_b_pool := params.token_b_in;

        const init_shares : nat =
          if params.token_a_in < params.token_b_in
          then params.token_a_in
          else params.token_b_in;

        s.ledger[(Tezos.sender, token_id)] := record [
            balance    = init_shares;
            allowances = (set [] : set(address));
          ];
        pair.total_supply := init_shares;

        s.pairs[token_id] := pair;
        s.tokens[token_id] := params.pair;

        operations :=
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_a_in,
            params.pair.token_a_type
          ) # operations;
        operations :=
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_b_in,
            params.pair.token_b_type
          ) # operations;
      }
    | _                 -> skip
    end
} with (operations, s)

(* Intrenal functions for swap hops *)
function internal_token_to_token_swap(
  var tmp               : tmp_swap_type;
  const params          : swap_slice_type)
                        : tmp_swap_type is
  block {
    const pair : pair_type = get_pair(params.pair_id, tmp.s);
    const tokens : tokens_type = get_tokens(params.pair_id, tmp.s);
    var swap: swap_data_type :=
      form_swap_data(pair, tokens, params.operation);

    assert_with_error(
      pair.token_a_pool * pair.token_b_pool =/= 0n,
      err_no_liquidity);
    assert_with_error(
      tmp.amount_in =/= 0n,
      err_zero_in);
    assert_with_error(
      swap.from_.token = tmp.token_in,
      err_wrong_route);

    const from_in_with_fee : nat = tmp.amount_in * fee_num;
    const numerator : nat = from_in_with_fee * swap.to_.pool;
    const denominator : nat = swap.from_.pool * fee_denom + from_in_with_fee;
    const out : nat = numerator / denominator;

    swap.to_.pool := abs(swap.to_.pool - out);
    swap.from_.pool := swap.from_.pool + tmp.amount_in;

    tmp.amount_in := out;
    tmp.token_in := swap.to_.token;

    const updated_pair : pair_type = form_pools(
      swap.from_.pool,
      swap.to_.pool,
      pair.total_supply,
      params.operation);
    tmp.s.pairs[params.pair_id] := updated_pair;

    tmp.operation := Some(
      typed_transfer(
        Tezos.self_address,
        tmp.receiver,
        out,
        swap.to_.token
      ));
  } with tmp

(* Exchange tokens to tokens with multiple hops,
note: tokens should be approved before the operation *)
function token_to_token_route(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[
      Tezos.transaction(
        unit,
        0mutez,
        get_close_entrypoint(Tezos.self_address))
    ];
    case p of
      Swap(params) -> {
        assert_with_error(
          params.deadline >= Tezos.now,
          err_swap_outdated);

        const first_swap : swap_slice_type =
          case List.head_opt(params.swaps) of
            Some(swap) -> swap
          | None -> failwith(err_empty_route)
          end;

        const tokens : tokens_type = get_tokens(first_swap.pair_id, s);
        const token : token_type =
          case first_swap.operation of
            A_to_b -> tokens.token_a_type
          | B_to_a -> tokens.token_b_type
        end;

        const tmp : tmp_swap_type = List.fold(
          internal_token_to_token_swap,
          params.swaps,
          record [
            s = s;
            amount_in = params.amount_in;
            operation = (None : option(operation));
            receiver = params.receiver;
            token_in = token;
          ]
        );

        assert_with_error(
          tmp.amount_in >= params.min_amount_out,
          err_high_min_out);

        s := tmp.s;
        operations := (case tmp.operation of
            Some(o) -> o
          | None -> (failwith(err_empty_route) : operation)
          end) # operations;
        operations := typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.amount_in,
            token
          ) # operations;
      }
    | _                 -> skip
    end
  } with (operations, s)

(* Provide liquidity (both tokens) to the pool,
note: tokens should be approved before the operation *)
function invest_liquidity(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[
      Tezos.transaction(
        unit,
        0mutez,
        get_close_entrypoint(Tezos.self_address))
    ];
    case p of
      Invest(params) -> {
        assert_with_error(
          params.deadline >= Tezos.now,
          err_swap_outdated);

        var pair : pair_type := get_pair(params.pair_id, s);

        assert_with_error(
          pair.token_a_pool * pair.token_b_pool =/= 0n,
          err_no_liquidity);
        assert_with_error(
          params.shares =/= 0n,
          err_zero_in);

        var tokens_a_required : nat := div_ceil(params.shares
          * pair.token_a_pool, pair.total_supply);
        var tokens_b_required : nat := div_ceil(params.shares
          * pair.token_b_pool, pair.total_supply);

        assert_with_error(
          tokens_a_required <= params.token_a_in,
          err_low_max_a_in);
        assert_with_error(
          tokens_b_required <= params.token_b_in,
          err_low_max_b_in);

        var account : account_info := get_account((Tezos.sender,
          params.pair_id), s);
        const share : nat = account.balance;

        account.balance := share + params.shares;
        s.ledger[(Tezos.sender, params.pair_id)] := account;

        pair.token_a_pool := pair.token_a_pool + tokens_a_required;
        pair.token_b_pool := pair.token_b_pool + tokens_b_required;

        pair.total_supply := pair.total_supply + params.shares;
        s.pairs[params.pair_id] := pair;

        const tokens : tokens_type = get_tokens(params.pair_id, s);
        operations :=
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            tokens_a_required,
            tokens.token_a_type
          ) # operations;
        operations :=
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            tokens_b_required,
            tokens.token_b_type
          ) # operations;
      }
    | _                 -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens) from the pool by burning shares *)
function divest_liquidity(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[
      Tezos.transaction(
        unit,
        0mutez,
        get_close_entrypoint(Tezos.self_address))
    ];
    case p of
      Divest(params) -> {
        assert_with_error(
          params.deadline >= Tezos.now,
          err_swap_outdated);

        var pair : pair_type := get_pair(params.pair_id, s);

        assert_with_error(
          s.pairs_count =/= params.pair_id,
          err_pair_not_listed);
        assert_with_error(
          pair.token_a_pool * pair.token_b_pool =/= 0n,
          err_no_liquidity);

        var account : account_info := get_account((Tezos.sender, params.pair_id), s);
        const share : nat = account.balance;

        assert_with_error(
          params.shares <= share,
          err_insufficient_lp);

        account.balance := abs(share - params.shares);
        s.ledger[(Tezos.sender, params.pair_id)] := account;

        const token_a_divested : nat =
          pair.token_a_pool * params.shares / pair.total_supply;
        const token_b_divested : nat =
          pair.token_b_pool * params.shares / pair.total_supply;

        assert_with_error(
          params.min_token_a_out =/= 0n and params.min_token_b_out =/= 0n,
          err_dust_out);
        assert_with_error(
          token_a_divested >= params.min_token_a_out
          and token_b_divested >= params.min_token_b_out,
          err_high_min_out);
        assert_with_error(
          pair.total_supply >= params.shares,
          err_low_supply);

        pair.total_supply := abs(pair.total_supply - params.shares);
        pair.token_a_pool := abs(pair.token_a_pool - token_a_divested);
        pair.token_b_pool := abs(pair.token_b_pool - token_b_divested);

        assert_with_error(
          ((pair.total_supply or pair.token_a_pool or pair.token_b_pool) = 0n)
          or (pair.total_supply * pair.token_a_pool * pair.token_b_pool =/= 0n),
          err_wrong_reserves_state);

        s.pairs[params.pair_id] := pair;

        const tokens : tokens_type = get_tokens(params.pair_id, s);
        operations :=
          typed_transfer(
            Tezos.self_address,
            Tezos.sender,
            token_a_divested,
            tokens.token_a_type
          ) # operations;
        operations :=
          typed_transfer(
            Tezos.self_address,
            Tezos.sender,
            token_b_divested,
            tokens.token_b_type
          ) # operations;
      }
    | _                 -> skip
    end
  } with (operations, s)
