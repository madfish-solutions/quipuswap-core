(* Helper function to get account *)
function get_account(
  const key             : (address * nat);
  const s               : storage_type)
                        : account_info is
  case s.ledger[key] of
    None -> record [
      balance    = 0n;
      allowances = (set [] : set (address));
    ]
  | Some(instance) -> instance
  end;

(* Helper function to get pair info *)
function get_pair(
  const pair_id         : nat;
  const s               : storage_type)
                        : pair_type is
  case s.pairs[pair_id] of
    None -> failwith(err_pair_not_listed)
  | Some(instance) -> instance
  end;

(* Helper function to get pair info *)
function get_tokens(
  const pair_id         : nat;
  const s               : storage_type)
                        : tokens_type is
  case s.tokens[pair_id] of
    None -> failwith(err_pair_not_listed)
  | Some(instance) -> instance
  end;

(* Helper function to get token pair *)
function get_pair_info(
  const key             : tokens_type;
  const s               : storage_type)
                        : (pair_type * nat) is
  block {
    const token_bytes : bytes = Bytes.pack(key);
    const token_id : nat =
      case s.token_to_id[token_bytes] of
        None -> s.pairs_count
      | Some(instance) -> instance
      end;
    const pair : pair_type =
      case s.pairs[token_id] of
        None -> record [
          token_a_pool    = 0n;
          token_b_pool    = 0n;
          total_supply    = 0n;
        ]
      | Some(instance) -> instance
      end;
  } with (pair, token_id)

(* Helper function to wrap the pair for swap *)
function form_pools(
  const from_pool       : nat;
  const to_pool         : nat;
  const supply          : nat;
  const direction       : swap_type)
                        : pair_type is
  case direction of
    B_to_a -> record [
      token_a_pool      = to_pool;
      token_b_pool      = from_pool;
      total_supply      = supply;
    ]
  | A_to_b -> record [
      token_a_pool      = from_pool;
      token_b_pool      = to_pool;
      total_supply      = supply;
    ]
  end;

(* Helper function to unwrap the pair for swap *)
function form_swap_data(
  const pair            : pair_type;
  const swap            : tokens_type;
  const direction       : swap_type)
                        : swap_data_type is
  block {
    const side_a : swap_side_type = record [
        pool            = pair.token_a_pool;
        token           = swap.token_a_type;
      ];
    const side_b : swap_side_type = record [
        pool            = pair.token_b_pool;
        token           = swap.token_b_type;
      ];
  } with case direction of
      A_to_b -> record [
        from_           = side_a;
        to_             = side_b;
      ]
    | B_to_a -> record [
        from_           = side_b;
        to_             = side_a;
      ]
    end;

(* Helper function to get fa2 token contract *)
function get_fa2_token_contract(
  const token_address   : address)
                        : contract(entry_fa2_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address)
      : option(contract(entry_fa2_type))) of
    Some(contr) -> contr
  | None -> (failwith(err_wrong_token_entrypoint) : contract(entry_fa2_type))
  end;

(* Helper function to get fa2 token contract *)
function get_close_entrypoint(
  const contr_address   : address)
                        : contract(unit) is
  case (Tezos.get_entrypoint_opt("%close", contr_address)
      : option(contract(unit))) of
    Some(contr) -> contr
  | None -> (failwith(err_wrong_close_entrypoint) : contract(unit))
  end;

(* Helper function to get fa1.2 token contract *)
function get_fa12_token_contract(
  const token_address   : address)
                        : contract(entry_fa12_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address)
     : option(contract(entry_fa12_type))) of
    Some(contr) -> contr
  | None -> (failwith(err_wrong_token_entrypoint) : contract(entry_fa12_type))
  end;

(* Helper function to transfer the asset based on its standard *)
function typed_transfer(
  const owner           : address;
  const receiver        : address;
  const amount_         : nat;
  const token           : token_type)
                        : operation is
    case token of
      Fa12(token_address) -> Tezos.transaction(
        TransferTypeFA12(owner, (receiver, amount_)),
        0mutez,
        get_fa12_token_contract(token_address)
      )
    | Fa2(token_info) -> Tezos.transaction(
        TransferTypeFA2(list[
          record[
            from_ = owner;
            txs = list [ record [
                to_           = receiver;
                token_id      = token_info.token_id;
                amount        = amount_;
              ] ]
          ]
        ]),
        0mutez,
        get_fa2_token_contract(token_info.token_address)
      )
    end;

(* Helper function to get the reentrancy entrypoint of the current contract *)
[@inline]
function check_reentrancy(
  const entered         : bool)
                        : bool is
  if entered
  then failwith(err_reentrancy)
  else True

[@inline]
function div_ceil(
  const numerator       : nat;
  const denominator     : nat)
                        : nat is
  case ediv(numerator, denominator) of
    Some(result) -> if result.1 > 0n
      then result.0 + 1n
      else result.0
  | None -> failwith(err_no_liquidity)
  end;