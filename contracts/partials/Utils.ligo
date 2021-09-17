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
        token           = swap.token_a_address;
        id              = swap.token_a_id;
        standard        = swap.token_a_type;
      ];
    const side_b : swap_side_type = record [
        pool            = pair.token_b_pool;
        token           = swap.token_b_address;
        id              = swap.token_b_id;
        standard        = swap.token_b_type;
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

(* Helper function to prepare the token transfer *)
function wrap_fa2_transfer_trx(
  const owner           : address;
  const receiver        : address;
  const value           : nat;
  const token_id        : nat)
                        : entry_fa2_type is
  TransferTypeFA2(list[
    record[
      from_ = owner;
      txs = list [ record [
          to_           = receiver;
          token_id      = token_id;
          amount        = value;
        ] ]
    ]
  ])

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

(* Helper function to get fa2 token contract *)
function get_fa2_balance_entrypoint(
  const token_address   : address)
                        : contract(entry_fa2_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address)
      : option(contract(entry_fa2_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/not-token") : contract(entry_fa2_type))
  end;

(* Helper function to get fa1.2 token contract *)
function get_fa12_balance_entrypoint(
  const token_address   : address)
                        : contract(entry_fa12_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address)
     : option(contract(entry_fa12_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/not-token") : contract(entry_fa12_type))
  end;

(* Helper function to get the reentrancy entrypoint of the current contract *)
function get_close_entrypoint(
  const self            : address)
                        : contract(unit) is
  case (Tezos.get_entrypoint_opt("%close", self)
     : option(contract(unit))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/no-close-entrypoint") : contract(unit))
  end;

function get_bal_fa12_a(
  const self            : address)
                        : contract(nat) is
  case (Tezos.get_entrypoint_opt("%balanceAFA12", self)
      : option(contract(nat))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balanceAFa12") : contract(nat))
  end

function get_bal_fa12_b(
  const self            : address)
                        : contract(nat) is
  case (Tezos.get_entrypoint_opt("%balanceBFA12", self)
     : option(contract(nat))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balanceBFa12") : contract(nat))
  end

function get_bal_fa2_a(
  const self            : address)
                        : contract(list(balance_of_response)) is
  case (Tezos.get_entrypoint_opt("%balanceAFA2", self)
     : option(contract(list(balance_of_response)))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balanceAFa2") : contract(list(balance_of_response)))
  end

function get_bal_fa2_b(
  const self            : address)
                        : contract(list(balance_of_response)) is
  case (Tezos.get_entrypoint_opt("%balanceBFA2", self)
     : option(contract(list(balance_of_response)))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balanceBFa2") : contract(list(balance_of_response)))
  end

function get_fa12_balance_entrypoint(
  const token           : address)
                        : contract(bal_fa12_type) is
  case (Tezos.get_entrypoint_opt("%getBalance", token)
      : option(contract(bal_fa12_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balance-of-ep") : contract(bal_fa12_type))
  end

function get_fa2_balance_entrypoint(
  const token           : address)
                        : contract(bal_fa2_type) is
  case (Tezos.get_entrypoint_opt("%balance_of", token)
      : option(contract(bal_fa2_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/balance-of-ep") : contract(bal_fa2_type))
  end

function get_ensured_initialize_entrypoint(
  const token           : address)
                        : contract(ensured_add_type) is
  case (Tezos.get_entrypoint_opt("%ensuredAddPair", token)
      : option(contract(ensured_add_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/no-entrypoint") : contract(ensured_add_type))
  end

function get_ensured_invest_entrypoint(
  const token           : address)
                        : contract(ensured_invest_type) is
  case (Tezos.get_entrypoint_opt("%ensuredInvest", token)
      : option(contract(ensured_invest_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/no-entrypoint") : contract(ensured_invest_type))
  end

function get_ensured_swap_entrypoint(
  const token           : address)
                        : contract(ensured_route_type) is
  case (Tezos.get_entrypoint_opt("%ensuredSwap", token)
      : option(contract(ensured_route_type))) of
    Some(contr) -> contr
  | None -> (failwith("Dex/no-entrypoint") : contract(ensured_route_type))
  end

(* Helper function to transfer fa2 tokens *)
function get_balance_fa2(
  const user            : address;
  const token_id        : nat;
  const token           : address;
  const callback        : contract(list(balance_of_response)))
                        : operation is
  Tezos.transaction(
    record [
      requests = list [
        record [
          owner    = user;
          token_id = token_id;
        ]
      ];
      callback = callback
    ],
    0mutez,
    get_fa2_balance_entrypoint(token)
  );

(* Helper function to transfer fa1.2 tokens *)
function get_balance_fa12(
  const user            : address;
  const token           : address;
  const callback        : contract(nat))
                        : operation is
  Tezos.transaction(
    (user, callback),
    0mutez,
    get_fa12_balance_entrypoint(token)
  );

(* Helper function to transfer the asset based on its standard *)
function typed_transfer(
  const owner         : address;
  const receiver        : address;
  const amount_         : nat;
  const token_id        : nat;
  const token           : address;
  const standard        : token_type)
                        : operation is
    case standard of
      Fa12 -> Tezos.transaction(
        TransferTypeFA12(owner, (receiver, amount_)),
        0mutez,
        get_fa12_token_contract(token)
      )
    | Fa2 -> Tezos.transaction(
        TransferTypeFA2(list[
          record[
            from_ = owner;
            txs = list [ record [
                to_           = receiver;
                token_id      = token_id;
                amount        = amount_;
              ] ]
          ]
        ]),
        0mutez,
        get_fa2_token_contract(token)
      )
    end;

(* Helper function to transfer the asset based on its standard *)
function typed_get_balance(
  const account         : address;
  const token_id        : nat;
  const token           : address;
  const standard        : token_type;
  const name            : token_name)
                        : operation is
  block {
    var op : option(operation) := (None : option(operation));
    case standard of
      Fa12 -> {
        const callback : contract(nat) =
          case name of
            A -> get_bal_fa12_a(account)
          | B -> get_bal_fa12_b(account)
          end;
        op := Some(get_balance_fa12(
          account,
          token,
          callback));
        }
    | Fa2 -> {
        const callback : contract(list(balance_of_response)) =
          case name of
            A -> get_bal_fa2_a(account)
          | B -> get_bal_fa2_b(account)
          end;
        op := Some(get_balance_fa2(
          account,
          token_id,
          token,
          callback));
      }
    end;
  } with case op of
      Some(o) -> o
    | None -> (failwith("Dex/no-balance") : operation)
    end

(* Helper function to transfer the asset based on its standard *)
function check_token_id(
  const token_id        : nat;
  const standard        : token_type)
                        : unit is
  case standard of
    Fa12 -> if token_id = 0n
      then unit
      else (failwith("Dex/non-zero-token-id") : unit)
  | Fa2 -> unit
  end;
