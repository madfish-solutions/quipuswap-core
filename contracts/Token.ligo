#include "IToken.ligo"

function isAllowed (const accountFrom : address ; const value : nat ; var s : contract_storage) : bool is 
  begin
    var allowed: bool := False;
    if Tezos.sender =/= accountFrom then block {
      const src: account = Big_map.find(accountFrom, s.ledger);
      const allowanceAmount: nat = Big_map.find(Tezos.sender, src.allowances);
      allowed := allowanceAmount >= value;
    };
    else allowed := True;
  end with allowed

function transfer (const accountFrom : address ; const destination : address ; const value : nat ; var s : contract_storage) : contract_storage is
 begin  
  if accountFrom = destination then skip;
  else block {
    // Is Tezos.sender allowed to spend value in the name of accountFrom
    if isAllowed(accountFrom, value, s) then skip else failwith ("Tezos.sender not allowed to spend token from source");

    // Fetch src account
    const src: account = Big_map.find(accountFrom, s.ledger);

    // Check that the accountFrom can spend that much
    if value > src.balance 
    then failwith ("Source balance is too low");
    else skip;

    // Update the accountFrom balance
    // Using the abs function to convert int to nat
    src.balance := abs(src.balance - value);

    s.ledger[accountFrom] := src;

    // Fetch dst account or add empty dst account to ledger
    var dst: account := record 
        balance = 0n;
        allowances = (map end : map(address, nat));
    end;
    case s.ledger[destination] of
    | None -> skip
    | Some(n) -> dst := n
    end;

    // Update the destination balance
    dst.balance := dst.balance + value;

    // Decrease the allowance amount if necessary
    case src.allowances[Tezos.sender] of
    | None -> skip
    | Some(dstAllowance) -> src.allowances[Tezos.sender] := abs(dstAllowance - value)  // ensure non negative
    end;

    s.ledger[accountFrom] := src;
    s.ledger[destination] := dst;
  }
 end with s

function mint (const value : nat ; var s : contract_storage) : contract_storage is
 begin
  if Tezos.sender =/= s.owner then failwith("You must be the owner of the contract to mint tokens");
  else block {
    var ownerAccount: account := record 
        balance = 0n;
        allowances = (map end : map(address, nat));
    end;
    case s.ledger[s.owner] of
    | None -> skip
    | Some(n) -> ownerAccount := n
    end;

    // Update the owner balance
    ownerAccount.balance := ownerAccount.balance + value;
    s.ledger[s.owner] := ownerAccount;
    s.totalSupply := abs(s.totalSupply + 1);
  }
 end with s

function burn (const value : nat ; var s : contract_storage) : contract_storage is
 begin
  if Tezos.sender =/= s.owner then failwith("You must be the owner of the contract to burn tokens");
  else block {
    var ownerAccount: account := record 
        balance = 0n;
        allowances = (map end : map(address, nat));
    end;
    case s.ledger[s.owner] of
    | None -> skip
    | Some(n) -> ownerAccount := n
    end;

    // Check that the owner can spend that much
    if value > ownerAccount.balance 
    then failwith ("Owner balance is too low");
    else skip;

    // Update the owner balance
    // Using the abs function to convert int to nat
    ownerAccount.balance := abs(ownerAccount.balance - value);
    s.ledger[s.owner] := ownerAccount;
    s.totalSupply := abs(s.totalSupply - 1);
  }
 end with s

function approve (const spender : address ; const value : nat ; var s : contract_storage) : contract_storage is
 begin
  // If Tezos.sender is the spender approving is not necessary
  if Tezos.sender = spender then skip;
  else block {
    const src: account = Big_map.find(Tezos.sender, s.ledger);
    src.allowances[spender] := value;
    s.ledger[Tezos.sender] := src; // Not sure if this last step is necessary
  }
 end with s

function getAllowance (const owner : address ; const spender : address ; const contr : contract(nat) ; var s : contract_storage) : list(operation) is
 begin
  const src: account = Big_map.find(owner, s.ledger);
  const destAllowance: nat = Big_map.find(spender, src.allowances);
 end with list [Tezos.transaction(destAllowance, 0tz, contr)]

function getBalance (const accountFrom : address ; const contr : contract(nat) ; var s : contract_storage) : list(operation) is
 begin
  const src: account = Big_map.find(accountFrom, s.ledger);
 end with list [Tezos.transaction(src.balance, 0tz, contr)]

function getTotalSupply (const contr : contract(nat) ; var s : contract_storage) : list(operation) is
  list [Tezos.transaction(s.totalSupply, 0tz, contr)]

function main (const p : tokenAction ; const s : contract_storage) :
  (list(operation) * contract_storage) is
 block { 
   // Reject any Tezos.transaction that try to transfer token to this contract
   if amount =/= 0tz then failwith ("This contract do not accept token");
   else skip;
  } with case p of
  | Transfer(n) -> ((nil : list(operation)), transfer(n.0, n.1, n.2, s))
  | Approve(n) -> ((nil : list(operation)), approve(n.0, n.1, s))
  | GetAllowance(n) -> (getAllowance(n.0, n.1, n.2, s), s)
  | GetBalance(n) -> (getBalance(n.0, n.1, s), s)
  | GetTotalSupply(n) -> (getTotalSupply(n.1, s), s)
  | Mint(n) -> ((nil : list(operation)), mint(n, s))
  | Burn(n) -> ((nil : list(operation)), burn(n, s))
 end