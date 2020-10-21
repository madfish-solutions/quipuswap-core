#include "../partials/IMintableToken.ligo"

(* Helper function to get account *)
function getAccount (const addr : address; const s : storage) : account is
  block {
    var acct : account :=
      record [
        balance    = 0n;
        allowances = (map [] : map (address, amt));
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Helper function to get allowance for an account *)
function getAllowance (const ownerAccount : account; const spender : address; const s : storage) : amt is
  case ownerAccount.allowances[spender] of
    Some (amt) -> amt
  | None -> 0n
  end;

(* Transfer token to another account *)
function transfer (const from_ : address; const to_ : address; const value : amt; var s : storage) : return is
  block {
    (* Sending to yourself? *)
    if from_ = to_ then
      failwith("InvalidSelfToSelfTransfer")
    else skip;

    (* Retrieve sender account from storage *)
    const senderAccount : account = getAccount(from_, s);

    (* Balance check *)
    if senderAccount.balance < value then
      failwith("NotEnoughBalance")
    else skip;

    (* Check this address can spend the tokens *)
    if from_ =/= Tezos.sender then block {
      const spenderAllowance : amt = getAllowance(senderAccount, Tezos.sender, s);

      if spenderAllowance < value then
        failwith("NotEnoughAllowance")
      else skip;

      (* Decrease any allowances *)
      senderAccount.allowances[Tezos.sender] := abs(spenderAllowance - value);
    } else skip;

    (* Update sender balance *)
    senderAccount.balance := abs(senderAccount.balance - value);

    (* Update storage *)
    s.ledger[from_] := senderAccount;

    (* Create or get destination account *)
    var destAccount : account := getAccount(to_, s);

    (* Update destination balance *)
    destAccount.balance := destAccount.balance + value;

    (* Update storage *)
    s.ledger[to_] := destAccount;

  } with (noOperations, s)

(* Burn token from another account *)
function burn (const from_ : address; const value : amt; var s : storage) : return is
  block {
    (* Retrieve sender account from storage *)
    const senderAccount : account = getAccount(from_, s);

    (* Balance check *)
    if senderAccount.balance < value then
      failwith("NotEnoughBalance")
    else skip;

    (* Check this address can spend the tokens *)
    if from_ =/= Tezos.sender then block {
      const spenderAllowance : amt = getAllowance(senderAccount, Tezos.sender, s);

      if spenderAllowance < value then
        failwith("NotEnoughAllowance")
      else skip;

      (* Decrease any allowances *)
      senderAccount.allowances[Tezos.sender] := abs(spenderAllowance - value);
    } else skip;

    (* Update sender balance *)
    senderAccount.balance := abs(senderAccount.balance - value);

    (* Update supply *)
    s.totalSupply := abs(s.totalSupply - value);

  } with (noOperations, s)

(* Mint token to another account *)
function mint (const to_ : address; const value : amt; var s : storage) : return is
  block {
    (* Sending to yourself? *)
    if  s.minters contains Tezos.sender then
      failwith("InvalidMinter")
    else skip;

    (* Create or get destination account *)
    var destAccount : account := getAccount(to_, s);

    (* Update destination balance *)
    destAccount.balance := destAccount.balance + value;

    (* Update storage *)
    s.ledger[to_] := destAccount;

    (* Update supply *)
    s.totalSupply := s.totalSupply + value;

  } with (noOperations, s)

(* Set minter status *)
function setMinter (const owner : address; const status : bool; var s : storage) : return is
  block {
    (* Sending to yourself? *)
    if s.admin = Tezos.sender then
      failwith("InvalidAdmin")
    else skip;

    (* Update status *)
    if status then
      s.minters := Set.add (owner, s.minters)
    else
      s.minters := Set.remove (owner, s.minters);

  } with (noOperations, s)

(* Set admin token to another account *)
function setAdmin (const admin : address; var s : storage) : return is
  block {
    (* Sending to yourself? *)
    if s.admin = Tezos.sender then
      failwith("InvalidAdmin")
    else skip;

    (* Update admin *)
    s.admin := admin;

  } with (noOperations, s)

(* Approve an amt to be spent by another address in the name of the sender *)
function approve (const spender : address; const value : amt; var s : storage) : return is
  block {
    if spender = Tezos.sender then
      failwith("InvalidSelfToSelfApproval")
    else skip;

    (* Create or get sender account *)
    var senderAccount : account := getAccount(Tezos.sender, s);

    (* Get current spender allowance *)
    const spenderAllowance : amt = getAllowance(senderAccount, spender, s);

    (* Prevent a corresponding attack vector *)
    // if spenderAllowance > 0n and value > 0n then
    //   failwith("UnsafeAllowanceChange")
    // else skip;

    (* Set spender allowance *)
    senderAccount.allowances[spender] := value;

    (* Update storage *)
    s.ledger[Tezos.sender] := senderAccount;

  } with (noOperations, s)

(* View function that forwards the balance of source to a contract *)
function getBalance (const owner : address; const contr : contract(amt); var s : storage) : return is
  block {
    const ownerAccount : account = getAccount(owner, s);
  } with (list [transaction(ownerAccount.balance, 0tz, contr)], s)

(* View function that forwards the allowance amt of spender in the name of tokenOwner to a contract *)
function getAllowance (const owner : address; const spender : address; const contr : contract(amt); var s : storage) : return is
  block {
    const ownerAccount : account = getAccount(owner, s);
    const spenderAllowance : amt = getAllowance(ownerAccount, spender, s);
  } with (list [transaction(spenderAllowance, 0tz, contr)], s)

(* View function that forwards the totalSupply to a contract *)
function getTotalSupply (const contr : contract(amt); var s : storage) : return is
  block {
    skip
  } with (list [transaction(s.totalSupply, 0tz, contr)], s)

(* Main entrypoint *)
function main (const action : tokenAction; var s : storage) : return is
  block {
    skip
  } with case action of

    | Mint(params) -> mint(params.0, params.1, s)
    | Burn(params) -> burn(params.0, params.1, s)
    | SetMinter(params) -> setMinter(params.0, params.1, s)
    | SetAdmin(params) -> setAdmin(params, s)
    | Transfer(params) -> transfer(params.0, params.1.0, params.1.1, s)
    | Approve(params) -> approve(params.0, params.1, s)
    | GetBalance(params) -> getBalance(params.0, params.1, s)
    | GetAllowance(params) -> getAllowance(params.0.0, params.0.1, params.1, s)
    | GetTotalSupply(params) -> getTotalSupply(params.1, s)
  end;
