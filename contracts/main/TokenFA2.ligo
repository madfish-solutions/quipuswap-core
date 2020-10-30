#include "../partials/ITokenFA2.ligo"

(* Helper function to get account *)
function getAccount (const addr : address; const s : storage) : account is
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

(* Perform transfers from one sender *)
function iterateTransfer (const s : storage; const params : transferParam) : storage is
  block {
    const userTrxParams: transferParam_ = Layout.convert_from_right_comb(params);

    (* Retrieve sender account from storage *)
    const senderAccount : account = getAccount(userTrxParams.from_, s);

    (* Perform single transfer *)
    function makeTransfer(const s : storage; const params : transferDestination) : storage is 
      block { 
        const transfer: transferDestination_ = Layout.convert_from_right_comb(params);

        (* Token id check *)
        if defaultTokenId =/= transfer.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Balance check *)
        if senderAccount.balance < transfer.amount then
          failwith("FA2_INSUFFICIENT_BALANCE")
        else skip;

        // XXX::check permission policy

        (* Update sender balance *)
        senderAccount.balance := abs(senderAccount.balance - transfer.amount);

        (* Update storage *)
        s.ledger[userTrxParams.from_] := senderAccount;

        (* Create or get destination account *)
        var destAccount : account := getAccount(transfer.to_, s);

        (* Update destination balance *)
        destAccount.balance := destAccount.balance + transfer.amount;

        (* Update storage *)
        s.ledger[transfer.to_] := destAccount;
    } with s

} with (List.fold (makeTransfer, userTrxParams.txs, s))

(* Perform single operator update *)
function iterateUpdateOperator (const s : storage; const params : updateOperatorParam) : storage is
  block {
    case params of
    | Add_operator(p) -> {
      const param: operatorParam_ = Layout.convert_from_right_comb(p);

      (* Token id check *)
      if defaultTokenId =/= param.token_id then
        failwith("FA2_TOKEN_UNDEFINED")
      else skip;
      
      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else skip;

      (* Create or get sender account *)
      var senderAccount : account := getAccount(param.owner, s);

      (* Set operator *)
      senderAccount.allowances := Set.add(param.operator, senderAccount.allowances);

      (* Update storage *)
      s.ledger[param.owner] := senderAccount;
    }
    | Remove_operator(p) -> {
      const param: operatorParam_ = Layout.convert_from_right_comb(p);

      (* Token id check *)
      if defaultTokenId =/= param.token_id then
        failwith("FA2_TOKEN_UNDEFINED")
      else skip;
      
      (* Check an owner *)
      if Tezos.sender =/= param.owner then
        failwith("FA2_NOT_OWNER")
      else skip;

      (* Create or get sender account *)
      var senderAccount : account := getAccount(param.owner, s);

      (* Set operator *)
      senderAccount.allowances := Set.remove(param.operator, senderAccount.allowances);

      (* Update storage *)
      s.ledger[param.owner] := senderAccount;
    }
    end
  } with s

(* Perform balance look up *)
function getBalanceOf (const params : balanceParams; const s : storage) : list(operation) is
  block {
    const balanceParams: balanceParams_ = Layout.convert_from_right_comb(params);

    (* Perform single balance lookup *)
    function lookUpBalance(const l: list (balanceOfResponse); const request : balanceOfRequest) : list (balanceOfResponse) is
      block {       
        (* Token id check *)
        if defaultTokenId =/= request.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Retrieve the asked account balance from storage *)
        const senderAccount : account = getAccount(request.owner, s);

        (* Form the response *)
        const response : balanceOfResponse_ = record [
          request   = request;
          balance   = senderAccount.balance;
        ];
        const convertedResp : balanceOfResponse = Layout.convert_to_right_comb(response);  
      } with convertedResp # l;
    
    (* Collect balances *)
    const resp : list (balanceOfResponse) = List.fold(lookUpBalance, balanceParams.requests, (nil: list(balanceOfResponse)));
  } with list [transaction(resp, 0tz, balanceParams.callback)]

function main (const action : tokenAction; var s : storage) : return is
  block {
    skip
  } with case action of
    | Transfer(params) -> ((nil : list (operation)), List.fold(iterateTransfer, params, s))
    | Balance_of(params) -> (getBalanceOf(params, s), s)
    // | Token_metadata_registry(params) -> tokenMetadataRegistry(params.0, params.1, s)
    // | Permissions_descriptor(params) -> permissionDescriptor(params.0.0, params.0.1, params.1, s)
    | Update_operators(params) -> ((nil : list (operation)), List.fold(iterateUpdateOperator, params, s))
  end;
  