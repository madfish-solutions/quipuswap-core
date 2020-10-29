#include "../partials/ITokenFA2.ligo"

(* Helper function to get account *)
function getAccount (const addr : address; const s : storage) : account is
  case s.ledger[addr] of
      None -> 0n
    | Some(instance) -> instance
    end;

(* Perform transfers from one sender *)
function iterateTransfer (const s : storage; const params : transferParam) : storage is
  block {
    const userTrxParams: transferParam_ = Layout.convert_from_right_comb(params);

    (* Transfer token to another account *)
    function makeTransfer(const s : storage; const params : transferDestination) : storage is 
      block { 
        (* Retrieve sender account from storage *)
        const senderAccount : account = getAccount(userTrxParams.from_, s);

        const transfer: transferDestination_ = Layout.convert_from_right_comb(params);

        (* Token id check *)
        if defaultTokenId =/= transfer.token_id then
          failwith("FA2_TOKEN_UNDEFINED")
        else skip;

        (* Balance check *)
        if senderAccount < transfer.amount then
          failwith("FA2_INSUFFICIENT_BALANCE")
        else skip;

        // XXX::check permission policy

        (* Update sender balance *)
        senderAccount := abs(senderAccount - transfer.amount);

        (* Update storage *)
        s.ledger[userTrxParams.from_] := senderAccount;

        (* Create or get destination account *)
        var destAccount : account := getAccount(transfer.to_, s);

        (* Update destination balance *)
        destAccount := destAccount + transfer.amount;

        (* Update storage *)
        s.ledger[transfer.to_] := destAccount;
    } with s

} with (List.fold (makeTransfer, userTrxParams.txs, s))

function main (const action : tokenAction; var s : storage) : return is
  block {
    skip
  } with case action of
    | Transfer(params) -> ((nil : list (operation)), List.fold(iterateTransfer, params, s))
    // | Balance_of(params) -> balanceOf(params.0, params.1, s)
    // | Token_metadata_registry(params) -> tokenMetadataRegistry(params.0, params.1, s)
    // | Permissions_descriptor(params) -> permissionDescriptor(params.0.0, params.0.1, params.1, s)
    // | Update_operators(params) -> updateOperatorsAction(params.1, s)
  end;
  