
(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      AddPair(params) -> {
        if s.entered
        then failwith("Dex/reentrancy")
        else s.entered := True;

        s.tmp := record [
          balance_a = (None : option(nat));
          balance_b = (None : option(nat));
        ];

        (* prepare operations to get initial liquidity *)
        operations := list [
          typed_get_balance(
            params.pair.token_a_type,
            A(unit)
          );
          typed_get_balance(
            params.pair.token_b_type,
            B(unit)
          );
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_a_in,
            params.pair.token_a_type
          );
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_b_in,
            params.pair.token_b_type
          );
          typed_get_balance(
            params.pair.token_a_type,
            A(unit)
          );
          typed_get_balance(
            params.pair.token_b_type,
            B(unit)
          );
          Tezos.transaction(
            record [
              pair=params.pair;
              receiver=Tezos.sender;
            ],
            0mutez,
            get_ensured_initialize_entrypoint(Tezos.self_address)
          );
        ];
      }
    | _                 -> skip
    end
} with (operations, s)

(* Initialize exchange after the previous liquidity was drained *)
function ensured_initialize_exchange(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      EnsuredAddPair(params) -> {
        if Tezos.sender =/= Tezos.self_address
        then failwith("Dex/not-self")
        else skip;

        (* check preconditions *)
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-token-id")
        else skip;

        (* read pair info*)
        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        (* update counter if needed *)
        if s.pairs_count = token_id
        then {
          s.token_to_id[Bytes.pack(params.pair)] := token_id;
          s.pairs_count := s.pairs_count + 1n;
        }
        else skip;

        var token_a_in : nat := 0n;
        var token_b_in : nat := 0n;
        case s.tmp.balance_a of
          Some(balance_a) -> token_a_in := balance_a
        | None -> failwith("Dex/balanca-a-not-updated")
        end;
        case s.tmp.balance_b of
          Some(balance_b) -> token_b_in := balance_b
        | None -> failwith("Dex/balanca-b-not-updated")
        end;
        if token_a_in < 1n (* no token A invested *)
        then failwith("Dex/no-token-a")
        else skip;
        if token_b_in < 1n (* no token B invested *)
        then failwith("Dex/no-token-b")
        else skip;

        (* check preconditions *)
        if pair.token_a_pool * pair.token_b_pool =/= 0n (* no reserves *)
        then failwith("Dex/non-zero-reserves")
        else skip;
        if pair.total_supply =/= 0n  (* no shares owned *)
        then failwith("Dex/non-zero-shares")
        else skip;

        (* update pool reserves *)
        pair.token_a_pool := token_a_in;
        pair.token_b_pool := token_b_in;

        (* calculate initial shares *)
        const init_shares : nat =
          if token_a_in < token_b_in
          then token_a_in
          else token_b_in;

        (* distribute initial shares *)
        s.ledger[(params.receiver, token_id)] := record [
            balance    = init_shares;
            allowances = (set [] : set(address));
          ];
        pair.total_supply := init_shares;

        (* update storage_type *)
        s.pairs[token_id] := pair;
        s.tokens[token_id] := params.pair;
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
    (* check preconditions *)
    if params.pair.token_a_type > params.pair.token_b_type
    then failwith("Dex/wrong-pair")
    else skip;

    (* get pair info*)
    const res : (pair_type * nat) = get_pair(params.pair, tmp.s);
    const pair : pair_type = res.0;
    const token_id : nat = res.1;
    var swap: swap_data_type :=
      form_swap_data(pair, params.pair, params.operation);

    (* ensure there is liquidity *)
    if pair.token_a_pool * pair.token_b_pool = 0n
    then failwith("Dex/not-launched")
    else skip;
    if tmp.amount_in = 0n (* non-zero amount of tokens exchanged *)
    then failwith ("Dex/zero-amount-in")
    else skip;
    (* ensure the route is corresponding *)
    if swap.from_.token =/= tmp.token_in
    then failwith("Dex/wrong-route")
    else skip;

    (* calculate amount out *)
    const from_in_with_fee : nat = tmp.amount_in * fee_num;
    const numerator : nat = from_in_with_fee * swap.to_.pool;
    const denominator : nat = swap.from_.pool * fee_denom + from_in_with_fee;

    (* calculate swapped token amount *)
    const out : nat = numerator / denominator;

    (* update pools amounts *)
    swap.to_.pool := abs(swap.to_.pool - out);
    swap.from_.pool := swap.from_.pool + tmp.amount_in;

    (* update info for the next hop *)
    tmp.amount_in := out;
    tmp.token_in := swap.to_.token;

    (* update storage_type *)
    const updated_pair : pair_type = form_pools(
      swap.from_.pool,
      swap.to_.pool,
      pair.total_supply,
      params.operation);
    tmp.s.pairs[token_id] := updated_pair;

    (* prepare operations to withdraw user's tokens *)
    tmp.operation := Some(
      typed_transfer(
        tmp.sender,
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
        if s.entered
        then failwith("Dex/reentrancy")
        else s.entered := True;

        (* validate input params *)
        if List.size(params.swaps) < 1n (* the route is empty *)
        then failwith ("Dex/too-few-swaps")
        else skip;
        if params.amount_in = 0n (* non-zero amount of tokens exchanged *)
        then failwith ("Dex/zero-amount-in")
        else skip;
        if params.min_amount_out = 0n (* non-zero amount of tokens to receive *)
        then failwith ("Dex/zero-min-amount-out")
        else skip;

        s.tmp := record [
          balance_a = (None : option(nat));
          balance_b = (None : option(nat));
        ];

        (* get the first exchange info *)
        const first_swap : swap_slice_type =
          case List.head_opt(params.swaps) of
            Some(swap) -> swap
          | None -> (failwith("Dex/zero-swaps") : swap_slice_type)
          end;

        (* prepare operation to withdraw user's tokens *)
        case first_swap.operation of
          Sell -> {
          operations := list [
              (* from *)
              typed_get_balance(
                first_swap.pair.token_a_type,
                A(unit)
              );
              typed_transfer(
                Tezos.sender,
                Tezos.self_address,
                params.amount_in,
                first_swap.pair.token_a_type
              ) ;
              typed_get_balance(
                first_swap.pair.token_a_type,
                A(unit)
              );
              Tezos.transaction(
                record [
                  swaps=params.swaps;
                  min_amount_out=params.min_amount_out;
                  receiver=params.receiver;
                ],
                0mutez,
                get_ensured_swap_entrypoint(Tezos.self_address)
              );
            ];
          }
        | Buy -> {
          operations := list [
              (* from *)
              typed_get_balance(
                first_swap.pair.token_b_type,
                B(unit)
              );
              typed_transfer(Tezos.sender,
                Tezos.self_address,
                params.amount_in,
                first_swap.pair.token_b_type
              );
              typed_get_balance(
                first_swap.pair.token_b_type,
                B(unit)
              );
              Tezos.transaction(
                record [
                  swaps=params.swaps;
                  min_amount_out=params.min_amount_out;
                  receiver=params.receiver;
                ],
                0mutez,
                get_ensured_swap_entrypoint(Tezos.self_address)
              );
            ];
          }
        end;
      }
    | _                 -> skip
    end
  } with (operations, s)

(* Exchange tokens to tokens with multiple hops,
note: tokens should be approved before the operation *)
function ensured_route(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      EnsuredSwap(params) -> {
        if Tezos.sender =/= Tezos.self_address
        then failwith("Dex/not-self")
        else skip;

        (* get the first exchange info *)
        const first_swap : swap_slice_type =
          case List.head_opt(params.swaps) of
            Some(swap) -> swap
          | None -> (failwith("Dex/zero-swaps") : swap_slice_type)
          end;

        (* declare helper variables *)
        var token : token_type := first_swap.pair.token_a_type;
        var amount_in : nat := 0n;

        (* prepare operation to withdraw user's tokens *)
        case first_swap.operation of
          Sell ->
            case s.tmp.balance_a of
              Some(balance_a) -> amount_in := balance_a
            | None -> failwith("Dex/balanca-a-not-updated")
            end
        | Buy -> {
          token := first_swap.pair.token_b_type;
          case s.tmp.balance_b of
            Some(balance_b) -> amount_in := balance_b
          | None -> failwith("Dex/balanca-b-not-updated")
          end;
        }
        end;

        (* perform internal swaps *)
        const tmp : tmp_swap_type = List.fold(
          internal_token_to_token_swap,
          params.swaps,
          record [
            s = s;
            amount_in = amount_in;
            operation = (None : option(operation));
            sender = Tezos.self_address;
            receiver = params.receiver;
            token_in = token;
          ]
        );

        (* check the amount of tokens is sufficient *)
        if tmp.amount_in < params.min_amount_out
        then failwith ("Dex/wrong-min-out")
        else skip;

        (* update storage_type*)
        s := tmp.s;

        (* add token transfer to user's account to operations *)
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
        if s.entered
        then failwith("Dex/reentrancy")
        else s.entered := True;

        s.tmp := record [
          balance_a = (None : option(nat));
          balance_b = (None : option(nat));
        ];

        (* prepare operations to get initial liquidity *)
        operations := list [
          typed_get_balance(
            params.pair.token_a_type,
            A(unit)
          );
          typed_get_balance(
            params.pair.token_b_type,
            B(unit)
          );
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_a_in,
            params.pair.token_a_type
          );
          typed_transfer(
            Tezos.sender,
            Tezos.self_address,
            params.token_b_in,
            params.pair.token_b_type
          );
          typed_get_balance(
            params.pair.token_a_type,
            A(unit)
          );
          typed_get_balance(
            params.pair.token_b_type,
            B(unit)
          );
          Tezos.transaction(
            record [
              pair=params.pair;
              shares=params.shares;
              receiver=Tezos.sender;
            ],
            0mutez,
            get_ensured_invest_entrypoint(Tezos.self_address)
          );
        ];
      }
    | _                 -> skip
    end
  } with (operations, s)

(* Provide liquidity (both tokens) to the pool,
note: tokens should be approved before the operation *)
function ensured_invest(
  const p               : action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      EnsuredInvest(params) -> {
        if Tezos.sender =/= Tezos.self_address
        then failwith("Dex/not-self")
        else skip;

        (* check preconditions *)
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-pair")
        else skip;

        (* read pair info*)
        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        (* ensure there is liquidity *)
        if pair.token_a_pool * pair.token_b_pool = 0n
        then failwith("Dex/not-launched")
        else skip;

        (* ensure purchsed shares satisfy required minimum *)
        if params.shares = 0n
        then failwith("Dex/wrong-params")
        else skip;

        (* calculate tokens to be withdrawn *)
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

        (* update pool reserves *)
        var token_a_in : nat := 0n;
        var token_b_in : nat := 0n;
        case s.tmp.balance_a of
          Some(balance_a) -> token_a_in := balance_a
        | None -> failwith("Dex/balanca-a-not-updated")
        end;
        case s.tmp.balance_b of
          Some(balance_b) -> token_b_in := balance_b
        | None -> failwith("Dex/balanca-b-not-updated")
        end;

        (* ensure *)
        if tokens_a_required = 0n  (* providing liquidity won't impact on price *)
        then failwith("Dex/zero-token-a-in")
        else skip;
        if tokens_b_required = 0n (* providing liquidity won't impact on price *)
        then failwith("Dex/zero-token-b-in")
        else skip;
        if tokens_a_required > token_a_in (* required tokens doesn't exceed max allowed by user *)
        then failwith("Dex/low-max-token-a-in")
        else skip;
        if tokens_b_required > token_b_in (* required tez doesn't exceed max allowed by user *)
        then failwith("Dex/low-max-token-b-in")
        else skip;

        var account : account_info := get_account((params.receiver, token_id), s);
        const share : nat = account.balance;

        (* update user's shares *)
        account.balance := share + params.shares;
        s.ledger[(params.receiver, token_id)] := account;

        (* update reserves *)
        pair.token_a_pool := pair.token_a_pool + tokens_a_required;
        pair.token_b_pool := pair.token_b_pool + tokens_b_required;

        (* update total number of shares *)
        pair.total_supply := pair.total_supply + params.shares;
        s.pairs[token_id] := pair;

        (* send cahnge *)
        if tokens_a_required < token_a_in
        then
          operations :=
            typed_transfer(
              Tezos.self_address,
              params.receiver,
              abs(tokens_a_required - token_a_in),
              params.pair.token_a_type
            ) # operations
        else skip;
        if tokens_b_required < token_b_in then
          operations :=
            typed_transfer(
              Tezos.self_address,
              params.receiver,
              abs(tokens_b_required - token_b_in),
              params.pair.token_b_type
            ) # operations
        else skip;
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
        if s.entered
        then failwith("Dex/reentrancy")
        else s.entered := True;

        (* check preconditions *)
        if params.pair.token_a_type > params.pair.token_b_type
        then failwith("Dex/wrong-pair")
        else skip;

        (* read pair info*)
        const res : (pair_type * nat) = get_pair(params.pair, s);
        var pair : pair_type := res.0;
        const token_id : nat = res.1;

        (* ensure pair exist *)
        if s.pairs_count = token_id
        then failwith("Dex/pair-not-exist")
        else skip;
        if pair.token_a_pool * pair.token_b_pool = 0n
        then failwith("Dex/not-launched")
        else skip;

        var account : account_info := get_account((Tezos.sender, token_id), s);
        const share : nat = account.balance;

        (* ensure *)
        if params.shares = 0n (* minimal burn's shares are non-zero *)
        then failwith("Dex/zero-burn-shares")
        else skip;
        if params.shares > share (* burnt shares are lower than balance *)
        then failwith("Dex/insufficient-shares")
        else skip;

        (* update users shares *)
        account.balance := abs(share - params.shares);
        s.ledger[(Tezos.sender, token_id)] := account;

        (* calculate amount of token's sent to user *)
        const token_a_divested : nat =
          pair.token_a_pool * params.shares / pair.total_supply;
        const token_b_divested : nat =
          pair.token_b_pool * params.shares / pair.total_supply;

        (* ensure minimal amounts out are non-zero *)
        if params.min_token_a_out = 0n or params.min_token_b_out = 0n
        then failwith("Dex/dust-output")
        else skip;

        (* ensure minimal amounts are satisfied *)
        if token_a_divested < params.min_token_a_out
        or token_b_divested < params.min_token_b_out
        then failwith("Dex/high-expectation")
        else skip;

        (* update total shares *)
        pair.total_supply := abs(pair.total_supply - params.shares);

        (* update reserves *)
        pair.token_a_pool := abs(pair.token_a_pool - token_a_divested);
        pair.token_b_pool := abs(pair.token_b_pool - token_b_divested);

        (* update storage_type *)
        s.pairs[token_id] := pair;

        (* prepare operations with tokens to user *)
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

(* Remove liquidity (both tokens) from the pool by burning shares *)
function update_balance_fa_12_a(
  const p               : bal_action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      IBalanceAFA12(new_balance) -> {
      s.tmp.balance_a := Some(
        case s.tmp.balance_a of
          Some(prev_balance) ->
            if prev_balance > new_balance
            then (failwith("Dex/balance-decremented") : nat)
            else abs(new_balance - prev_balance)
        | None -> new_balance
      end);
    }
    | _                 -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens) from the pool by burning shares *)
function update_balance_fa_12_b(
  const p               : bal_action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      IBalanceBFA12(new_balance) -> {
      s.tmp.balance_b := Some(
        case s.tmp.balance_b of
          Some(prev_balance) ->
            if prev_balance > new_balance
            then (failwith("Dex/balance-decremented") : nat)
            else abs(new_balance - prev_balance)
        | None -> new_balance
        end);
    }
    | _                 -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens) from the pool by burning shares *)
function update_balance_fa_2_a(
  const p               : bal_action_type;
  var s                 : storage_type)
                        :  return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      IBalanceAFA2(responses) -> {
      const response : balance_of_response =
        case List.head_opt(responses) of
          Some(head) -> head
        | None -> (failwith("Dex/no-balance-response") : balance_of_response)
        end;

      if response.request.owner =/= Tezos.self_address
      then failwith("Dex/wrong-balance-owner")
      else skip;

      s.tmp.balance_a := Some(
        case s.tmp.balance_a of
          Some(prev_balance) ->
            if prev_balance > response.balance
            then (failwith("Dex/balance-decremented") : nat)
            else abs(response.balance - prev_balance)
        | None -> response.balance
        end);
    }
    | _                 -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens) from the pool by burning shares *)
function update_balance_fa_2_b(
  const p               : bal_action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      IBalanceBFA2(responses) -> {
      const response : balance_of_response =
        case List.head_opt(responses) of
          Some(head) -> head
        | None -> (failwith("Dex/no-balance-response") : balance_of_response)
        end;

      if response.request.owner =/= Tezos.self_address
      then failwith("Dex/wrong-balance-owner")
      else skip;

      s.tmp.balance_b := Some(
        case s.tmp.balance_b of
          Some(prev_balance) ->
            if prev_balance > response.balance
            then (failwith("Dex/balance-decremented") : nat)
            else abs(response.balance - prev_balance)
        | None -> response.balance
        end);
    }
    | _                 -> skip
    end
  } with (operations, s)
