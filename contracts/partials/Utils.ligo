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

(* Helper function to get token pair *)
function get_pair(
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
    Buy -> record [
      token_a_pool      = to_pool;
      token_b_pool      = from_pool;
      total_supply      = supply;
    ]
  | Sell -> record [
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
      Sell -> record [
        from_           = side_a;
        to_             = side_b;
      ]
    | Buy -> record [
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
  | None -> (failwith("Dex/not-token") : contract(entry_fa2_type))
  end;

(* Helper function to get fa1.2 token contract *)
function get_fa12_token_contract(
  const token_address   : address)
                        : contract(entry_fa12_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address)
     : option(contract(entry_fa12_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/not-token") : contract(entry_fa12_type))
  end;

(* Helper function to get the reentrancy entrypoint of the current contract *)
function get_close_entrypoint(
  const _               : unit)
                        : contract(unit) is
  case (Tezos.get_entrypoint_opt("%close", Tezos.self_address)
     : option(contract(unit))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/no-close-entrypoint") : contract(unit))
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
  then failwith("Dex/reentrancy")
  else True