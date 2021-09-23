#include "../partials/ITokenFA2.ligo"

(* Helper function to get account *)
function get_account (const addr : address; const s : storage_type) : account is
  case s.ledger[addr] of
    None ->  record [
      balance    = 0n;
      allowances = (set [] : set (address));
      ]
    | Some(instance) -> instance
  end;

(* Perform transfers from one owner *)
function iterate_transfer (const s : storage_type; const user_trx_params : transfer_param) : storage_type is
  block {
    (* Perform single transfer *)
    function make_transfer(var s : storage_type; const transfer : transfer_destination) : storage_type is
      block {
        (* Retrieve sender account from storage_type *)
        var sender_account : account := get_account(user_trx_params.from_, s);

        (* Check permissions *)
        if user_trx_params.from_ = Tezos.sender or sender_account.allowances contains Tezos.sender then
          skip
        else failwith("FA2_NOT_OPERATOR");

        (* Token id check *)
        if default_token_id =/= transfer.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Balance check *)
        if sender_account.balance < transfer.amount then
          failwith("FA2_INSUFFICIENT_BALANCE")
        else skip;

        (* Update sender balance *)
        sender_account.balance := abs(sender_account.balance - transfer.amount);

        (* Update storage_type *)
        s.ledger[user_trx_params.from_] := sender_account;

        (* Create or get destination account *)
        var dest_account : account := get_account(transfer.to_, s);

        (* Update destination balance *)
        dest_account.balance := dest_account.balance + transfer.amount;

        (* Update storage_type *)
        s.ledger[transfer.to_] := dest_account;
    } with s;
} with (List.fold (make_transfer, user_trx_params.txs, s))

(* Perform single operator update *)
function iterate_update_operator (var s : storage_type; const params : update_operator_param) : storage_type is
  block {
    case params of
    | Add_operator(param) -> {
      (* Token id check *)
      if default_token_id =/= param.token_id then
        failwith("FA2_TOKEN_UNDEFINED")
      else skip;

      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else skip;

      (* Create or get sender account *)
      var sender_account : account := get_account(param.owner, s);

      (* Set operator *)
      sender_account.allowances := Set.add(param.operator, sender_account.allowances);

      (* Update storage_type *)
      s.ledger[param.owner] := sender_account;
    }
    | Remove_operator(param) -> {
      (* Token id check *)
      if default_token_id =/= param.token_id then
        failwith("FA2_TOKEN_UNDEFINED")
      else skip;

      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else skip;

      (* Create or get sender account *)
      var sender_account : account := get_account(param.owner, s);

      (* Set operator *)
      sender_account.allowances := Set.remove(param.operator, sender_account.allowances);

      (* Update storage_type *)
      s.ledger[param.owner] := sender_account;
    }
    end
  } with s

(* Perform balance look up *)
function get_balance_of (const bal_fa2_type : bal_fa2_type; const s : storage_type) : list(operation) is
  block {

    (* Perform single balance lookup *)
    function look_up_balance(const l: list (balance_of_response); const request : balance_of_request) : list (balance_of_response) is
      block {
        (* Token id check *)
        if default_token_id =/= request.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Retrieve the asked account balance from storage_type *)
        const sender_account : account = get_account(request.owner, s);

        (* Form the response *)
        const response : balance_of_response = record [
          request   = request;
          balance   = sender_account.balance;
        ];
      } with response # l;

    (* Collect balances info *)
    const accumulated_response : list (balance_of_response) = List.fold(look_up_balance, bal_fa2_type.requests, (nil: list(balance_of_response)));
  } with list [transaction(accumulated_response, 0tz, bal_fa2_type.callback)]

(* TokenFA2 - Mock FA2 token for tests *)
function main (const action : token_action_type; var s : storage_type) : return_type is
  block {
    skip
  } with case action of
    | Transfer(params)                  -> ((nil : list (operation)), List.fold(iterate_transfer, params, s))
    | Balance_of(params)                -> (get_balance_of(params, s), s)
    | Update_operators(params)          -> ((nil : list (operation)), List.fold(iterate_update_operator, params, s))
  end;
