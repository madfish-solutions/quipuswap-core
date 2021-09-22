(* Perform transfers from one owner *)
[@inline]
function iterate_transfer(
  var s                 : storage_type;
  const user_trx_params : transfer_param)
                        : storage_type is
  block {
    function make_transfer(
      var s             : storage_type;
      const transfer    : transfer_destination)
                        : storage_type is
      block {
        const user_key : (address * nat) =
          (user_trx_params.from_,
          transfer.token_id);
        var sender_account : account_info := get_account(user_key, s);

        if user_trx_params.from_ = Tezos.sender
          or sender_account.allowances contains Tezos.sender
        then skip
        else failwith("FA2_NOT_OPERATOR");
        if sender_account.balance < transfer.amount
        then failwith("FA2_INSUFFICIENT_BALANCE")
        else skip;

        sender_account.balance := abs(sender_account.balance - transfer.amount);
        s.ledger[user_key] := sender_account;

        var dest_account : account_info :=
          get_account((transfer.to_, transfer.token_id), s);

        dest_account.balance := dest_account.balance + transfer.amount;
        s.ledger[(transfer.to_, transfer.token_id)] := dest_account;
    } with s;
} with (List.fold (make_transfer, user_trx_params.txs, s))

(* Perform single operator update *)
function iterate_update_operator(
  var s                 : storage_type;
  const params          : update_operator_param)
                        : storage_type is
  block {
    case params of
      Add_operator(param) -> {
      if Tezos.sender =/= param.owner
      then failwith("FA2_NOT_OWNER")
      else skip;

      var sender_account : account_info :=
        get_account((param.owner, param.token_id), s);

      sender_account.allowances :=
        Set.add(param.operator, sender_account.allowances);
      s.ledger[(param.owner, param.token_id)] := sender_account;
    }
    | Remove_operator(param) -> {
      if Tezos.sender =/= param.owner
      then failwith("FA2_NOT_OWNER")
      else skip;

      var sender_account : account_info :=
        get_account((param.owner, param.token_id), s);

      sender_account.allowances :=
        Set.remove(param.operator, sender_account.allowances);
      s.ledger[(param.owner, param.token_id)] := sender_account;
    }
    end
  } with s


function transfer(
  const p               : token_action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
    | ITransfer(params) -> {
      s := List.fold(iterate_transfer, params, s);
    }
    | _                 -> skip
    end
  } with (operations, s)

function get_balance_of(
  const p               : token_action_type;
  const s               : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
    | IBalance_of(bal_fa2_type) -> {
      function look_up_balance(
        const l         : list (balance_of_response);
        const request   : balance_of_request)
                        : list (balance_of_response) is
        block {
          const sender_account : account_info =
            get_account((request.owner, request.token_id), s);

          const response : balance_of_response = record [
            request   = request;
            balance   = sender_account.balance;
          ];
        } with response # l;

      const accumulated_response : list (balance_of_response) =
        List.fold(look_up_balance,
          bal_fa2_type.requests,
          (nil: list(balance_of_response)));
      operations := list[Tezos.transaction(
        accumulated_response,
        0mutez,
        bal_fa2_type.callback)];
    }
    | _                 -> skip
    end
  } with (operations, s)

function update_operators(
  const p               : token_action_type;
  var s                 : storage_type)
                        : return_type is
  block {
    var operations: list(operation) := list[];
    case p of
      IUpdate_operators(params) -> {
        s := List.fold(iterate_update_operator, params, s);
    }
    | _                 -> skip
    end
  } with (operations, s)