#include "../partials/ITokenFA2.ligo"

(* Helper function to get account *)
function get_account (const addr : address; const s : storage) : account is
  block {
    var acct : account :=
      record [
        balance    = 0n;
        allowances = (set [] : set (address));
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Perform transfers from one owner *)
function iterate_transfer (const s : storage; const user_trx_params : transfer_param) : storage is
  block {
    (* Retrieve sender account from storage *)
    const sender_account : account = get_account(user_trx_params.from_, s);

    (* Check permissions *)
    if user_trx_params.from_ = Tezos.sender or sender_account.allowances contains Tezos.sender then 
      skip
    else failwith("FA2_NOT_OPERATOR");

    (* Perform single transfer *)
    function make_transfer(const s : storage; const transfer : transfer_destination) : storage is 
      block { 
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

        (* Update storage *)
        s.ledger[user_trx_params.from_] := sender_account;

        (* Create or get destination account *)
        var dest_account : account := get_account(transfer.to_, s);

        (* Update destination balance *)
        dest_account.balance := dest_account.balance + transfer.amount;

        (* Update storage *)
        s.ledger[transfer.to_] := dest_account;
    } with s;
} with (List.fold (make_transfer, user_trx_params.txs, s))

(* Perform single operator update *)
function iterate_update_operator (const s : storage; const params : update_operator_param) : storage is
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

      (* Update storage *)
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

      (* Update storage *)
      s.ledger[param.owner] := sender_account;
    } 
    end
  } with s

(* Perform balance look up *)
function get_balance_of (const balance_params : balance_params; const s : storage) : list(operation) is
  block {

    (* Perform single balance lookup *)
    function look_up_balance(const l: list (balance_of_response); const request : balance_of_request) : list (balance_of_response) is
      block {       
        (* Token id check *)
        if default_token_id =/= request.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Retrieve the asked account balance from storage *)
        const sender_account : account = get_account(request.owner, s);

        (* Form the response *)
        const response : balance_of_response = record [
          request   = request;
          balance   = sender_account.balance;
        ];
      } with response # l;
    
    (* Collect balances info *)
    const accomulated_response : list (balance_of_response) = List.fold(look_up_balance, balance_params.requests, (nil: list(balance_of_response)));
  } with list [transaction(accomulated_response, 0tz, balance_params.callback)]

(* Perform balance look up *)
function get_token_metadata_registry (const receiver : contract(address); const s : storage) : list(operation) is
  list [transaction(Tezos.self_address, 0tz, receiver)]

function main (const action : token_action; var s : storage) : return is
  block {
    skip
  } with case action of
    | Transfer(params) -> ((nil : list (operation)), List.fold(iterate_transfer, params, s))
    | Balance_of(params) -> (get_balance_of(params, s), s)
    | Token_metadata_registry(params) -> (get_token_metadata_registry(params, s), s)
    | Update_operators(params) -> ((nil : list (operation)), List.fold(iterate_update_operator, params, s))
  end;
  