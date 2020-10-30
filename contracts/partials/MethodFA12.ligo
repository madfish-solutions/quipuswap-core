
(* Helper function to get account *)
function get_account (const addr : address; const s : dex_storage) : account_info is
  block {
    var acct : account_info :=
      record [
        balance         = 0n;
        frozen_balance   = 0n;
        allowances      = (map [] : map (address, nat));
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct
  
(* Helper function to get allowance for an account *)
function get_allowance (const owner_account : account_info; const spender : address; const s : dex_storage) : nat is
  case owner_account.allowances[spender] of
    Some (nat) -> nat
  | None -> 0n
  end;

(* Transfer token to another account *)
function transfer (const p : token_action; const s : dex_storage) : return is
  block {
    var operations: list(operation) := list[];
    case p of
    | ITransfer(params) -> {
      s := update_reward(s);

      const value : nat = params.1.1;
      if params.0 = params.1.0 then
        failwith("Dex/selt-transfer")
      else skip;
      const sender_account : account_info = get_account(params.0, s);
      if sender_account.balance < value then
        failwith("Dex/not-enough-balance")
      else skip;
      if params.0 =/= Tezos.sender then block {
        const spender_allowance : nat = get_allowance(sender_account, Tezos.sender, s);
        if spender_allowance < value then
          failwith("Dex/not-enough-allowance")
        else skip;
        sender_account.allowances[Tezos.sender] := abs(spender_allowance - value);
      } else skip;

      s := update_user_reward(params.0, sender_account, abs(sender_account.balance - value) + sender_account.frozen_balance,  s);

      sender_account.balance := abs(sender_account.balance - value);
      s.ledger[params.0] := sender_account;

      var dest_account : account_info := get_account(params.1.0, s);

      s := update_user_reward(params.1.0, dest_account, dest_account.balance + value + dest_account.frozen_balance, s);

      dest_account.balance := dest_account.balance + value;
      s.ledger[params.1.0] := dest_account;
    }
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with (operations, s)

(* Approve an nat to be spent by another address in the name of the sender *)
function approve (const p : token_action; const s : dex_storage) : return is
  block {
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> {
      if params.0 = Tezos.sender then
        failwith("Dex/selt-approval")
      else skip;
      var sender_account : account_info := get_account(Tezos.sender, s);
      const spender_allowance : nat = get_allowance(sender_account, params.0, s);
      sender_account.allowances[params.0] := params.1;
      s.ledger[Tezos.sender] := sender_account;
    }
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with ((nil  : list(operation)), s)

(* View function that forwards the balance of source to a contract *)
function get_balance (const p : token_action; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> {
      const owner_account : account_info = get_account(params.0, s);
      operations := list [transaction(owner_account.balance, 0tz, params.1)];
    }
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with (operations, s)

(* View function that forwards the total_supply to a contract *)
function get_total_supply (const p : token_action; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> {
      operations := list [transaction(s.total_supply, 0tz, params.1)];
    }
    end
  } with (operations, s)
