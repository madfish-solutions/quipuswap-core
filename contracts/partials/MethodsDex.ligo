(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      AddPair(params) -> {
        s.entered := check_reentrancy(s.entered);
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-token-id")
        else skip;

        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        if s.pairs_count = token_id
        then {
          s.token_to_id[Bytes.pack(params.pair)] := token_id;
          s.pairs_count := s.pairs_count + 1n;
        }
        else skip;

        if params.token_a_in < 1n
        then failwith("Dex/no-token-a")
        else skip;
        if params.token_b_in < 1n
        then failwith("Dex/no-token-b")
        else skip;

        if pair.token_a_pool * pair.token_b_pool =/= 0n
        then failwith("Dex/non-zero-reserves")
        else skip;
        if pair.total_supply =/= 0n
        then failwith("Dex/non-zero-shares")
        else skip;

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
    if params.pair.token_a_type > params.pair.token_b_type
    then failwith("Dex/wrong-pair")
    else skip;

    const res : (pair_type * nat) = get_pair(params.pair, tmp.s);
    const pair : pair_type = res.0;
    const pair_id : nat = res.1;
    var swap: swap_data_type :=
      form_swap_data(pair, params.pair, params.operation);

    if pair.token_a_pool * pair.token_b_pool = 0n
    then failwith("Dex/not-launched")
    else skip;
    if tmp.amount_in = 0n
    then failwith ("Dex/zero-amount-in")
    else skip;
    if swap.from_.token =/= tmp.token_in
    then failwith("Dex/wrong-route")
    else skip;

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
    tmp.s.pairs[pair_id] := updated_pair;

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
    var operations: list(operation) := list[];
    case p of
      Swap(params) -> {
        s.entered := check_reentrancy(s.entered);
        if List.size(params.swaps) < 1n
        then failwith ("Dex/too-few-swaps")
        else skip;
        if params.amount_in = 0n
        then failwith ("Dex/zero-amount-in")
        else skip;
        if params.min_amount_out = 0n
        then failwith ("Dex/zero-min-amount-out")
        else skip;

        const first_swap : swap_slice_type =
          case List.head_opt(params.swaps) of
            Some(swap) -> swap
          | None -> (failwith("Dex/zero-swaps") : swap_slice_type)
          end;

        const token : token_type = 
          case first_swap.operation of
            A_to_b -> first_swap.pair.token_a_type
          | B_to_a -> first_swap.pair.token_b_type
        end;

        operations :=
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.amount_in,
            token
          ) # operations;


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

        if tmp.amount_in < params.min_amount_out
        then failwith ("Dex/wrong-min-out")
        else skip;

        s := tmp.s;

        const last_operation : operation =
          case tmp.operation of
            Some(o) -> o
          | None -> (failwith("Dex/too-few-swaps") : operation)
          end;
        operations := last_operation # operations;
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
    var operations: list(operation) := list[];
    case p of
      Invest(params) -> {
        s.entered := check_reentrancy(s.entered);
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-pair")
        else skip;

        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        if pair.token_a_pool * pair.token_b_pool = 0n
        then failwith("Dex/not-launched")
        else skip;
        if params.shares = 0n
        then failwith("Dex/wrong-params")
        else skip;

        var tokens_a_required : nat :=
          params.shares * pair.token_a_pool / pair.total_supply;
        if params.shares * pair.token_a_pool >
          tokens_a_required * pair.total_supply
        then tokens_a_required := tokens_a_required + 1n
        else skip;
        var tokens_b_required : nat :=
          params.shares * pair.token_b_pool / pair.total_supply;
        if params.shares * pair.token_b_pool >
          tokens_b_required * pair.total_supply
        then tokens_b_required := tokens_b_required + 1n
        else skip;

        if tokens_a_required = 0n
        then failwith("Dex/zero-token-a-in")
        else skip;
        if tokens_b_required = 0n
        then failwith("Dex/zero-token-b-in")
        else skip;
        if tokens_a_required > params.token_a_in
        then failwith("Dex/low-max-token-a-in")
        else skip;
        if tokens_b_required > params.token_b_in
        then failwith("Dex/low-max-token-b-in")
        else skip;

        var account : account_info := get_account((Tezos.sender, token_id), s);
        const share : nat = account.balance;

        account.balance := share + params.shares;
        s.ledger[(Tezos.sender, token_id)] := account;

        pair.token_a_pool := pair.token_a_pool + tokens_a_required;
        pair.token_b_pool := pair.token_b_pool + tokens_b_required;

        pair.total_supply := pair.total_supply + params.shares;
        s.pairs[token_id] := pair;

        operations := list [
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            tokens_a_required,
            params.pair.token_a_type
          );
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            tokens_b_required,
            params.pair.token_b_type
          );
        ];
      }
    | _                 -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens) from the pool by burning shares *)
function divest_liquidity(
  const p               : action_type;
  var s                 : storage_type)
                        :  return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      Divest(params) -> {
        s.entered := check_reentrancy(s.entered);
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-pair")
        else skip;

        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        if s.pairs_count = token_id
        then failwith("Dex/pair-not-exist")
        else skip;
        if pair.token_a_pool * pair.token_b_pool = 0n
        then failwith("Dex/not-launched")
        else skip;

        var account : account_info := get_account((Tezos.sender, token_id), s);
        const share : nat = account.balance;

        if params.shares = 0n
        then failwith("Dex/zero-burn-shares")
        else skip;
        if params.shares > share
        then failwith("Dex/insufficient-shares")
        else skip;

        account.balance := abs(share - params.shares);
        s.ledger[(Tezos.sender, token_id)] := account;

        const token_a_divested : nat =
          pair.token_a_pool * params.shares / pair.total_supply;
        const token_b_divested : nat =
          pair.token_b_pool * params.shares / pair.total_supply;

        if params.min_token_a_out = 0n or params.min_token_b_out = 0n
        then failwith("Dex/dust-output")
        else skip;

        if token_a_divested < params.min_token_a_out
        or token_b_divested < params.min_token_b_out
        then failwith("Dex/high-expectation")
        else skip;

        pair.total_supply := abs(pair.total_supply - params.shares);
        pair.token_a_pool := abs(pair.token_a_pool - token_a_divested);
        pair.token_b_pool := abs(pair.token_b_pool - token_b_divested);

        s.pairs[token_id] := pair;

        operations :=
          typed_transfer(
            Tezos.self_address,
            Tezos.sender,
            token_a_divested,
            params.pair.token_a_type
          ) # operations;
        operations :=
          typed_transfer(
            Tezos.self_address,
            Tezos.sender,
            token_b_divested,
            params.pair.token_b_type
          ) # operations;
      }
    | _                 -> skip
    end
  } with (operations, s)
