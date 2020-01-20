// This is an implementation of the FA1.2 specification in PascaLIGO

type amount is nat;

type account is record
    balance : amount;
    allowances: map(address, amount);
end

type action is
| Transfer of (address * address * amount)
| Mint of (amount)
| Burn of (amount)
| Approve of (address * amount)
| GetAllowance of (address * address * contract(amount))
| GetBalance of (address * contract(amount))
| GetTotalSupply of (unit * contract(amount))

type contract_storage is record
  owner: address;
  totalSupply: amount;
  ledger: big_map(address, account);
end

function isAllowed (const accountFrom : address ; const value : amount ; var s : contract_storage) : bool is 
  begin
    var allowed: bool := False;
    if sender =/= accountFrom then block {
      // Checking if the sender is allowed to spend in name of accountFrom
      const src: account = get_force(accountFrom, s.ledger);
      const allowanceAmount: amount = get_force(sender, src.allowances);
      allowed := allowanceAmount >= value;
    };
    else allowed := True;
  end with allowed

// Transfer a specific amount of tokens from accountFrom address to a destination address
// Preconditions:
//  The sender address is the account owner or is allowed to spend x in the name of accountFrom
//  The accountFrom account has a balance higher than the amount
// Postconditions:
//  The balance of accountFrom is decreased by the amount
//  The balance of destination is increased by the amount
function transfer (const accountFrom : address ; const destination : address ; const value : amount ; var s : contract_storage) : contract_storage is
 begin  
  // If accountFrom = destination transfer is not necessary
  if accountFrom = destination then skip;
  else block {
    // Is sender allowed to spend value in the name of accountFrom
    case isAllowed(accountFrom, value, s) of 
    | False -> failwith ("Sender not allowed to spend token from source")
    | True -> skip
    end;

    // Fetch src account
    const src: account = get_force(accountFrom, s.ledger);

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
        allowances = (map end : map(address, amount));
    end;
    case s.ledger[destination] of
    | None -> skip
    | Some(n) -> dst := n
    end;

    // Update the destination balance
    dst.balance := dst.balance + value;

    // Decrease the allowance amount if necessary
    case src.allowances[sender] of
    | None -> skip
    | Some(dstAllowance) -> src.allowances[sender] := abs(dstAllowance - value)  // ensure non negative
    end;

    s.ledger[accountFrom] := src;
    s.ledger[destination] := dst;
  }
 end with s

// Mint tokens into the owner balance
// Preconditions:
//  The sender is the owner of the contract
// Postconditions:
//  The minted tokens are added in the balance of the owner
//  The totalSupply is increased by the amount of minted token
function mint (const value : amount ; var s : contract_storage) : contract_storage is
 begin
  // If the sender is not the owner fail
  if sender =/= s.owner then failwith("You must be the owner of the contract to mint tokens");
  else block {
    var ownerAccount: account := record 
        balance = 0n;
        allowances = (map end : map(address, amount));
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

// Burn tokens from the owner balance
// Preconditions:
//  The owner have the required balance to burn
// Postconditions:
//  The burned tokens are subtracted from the balance of the owner
//  The totalSupply is decreased by the amount of burned token 
function burn (const value : amount ; var s : contract_storage) : contract_storage is
 begin
  // If the sender is not the owner fail
  if sender =/= s.owner then failwith("You must be the owner of the contract to burn tokens");
  else block {
    var ownerAccount: account := record 
        balance = 0n;
        allowances = (map end : map(address, amount));
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

// Approve an amount to be spent by another address in the name of the sender
// Preconditions:
//  The spender account is not the sender account
// Postconditions:
//  The allowance of spender in the name of sender is value
function approve (const spender : address ; const value : amount ; var s : contract_storage) : contract_storage is
 begin
  // If sender is the spender approving is not necessary
  if sender = spender then skip;
  else block {
    const src: account = get_force(sender, s.ledger);
    src.allowances[spender] := value;
    s.ledger[sender] := src; // Not sure if this last step is necessary
  }
 end with s

// View function that forwards the allowance amount of spender in the name of owner to a contract
// Preconditions:
//  None
// Postconditions:
//  The state is unchanged
function getAllowance (const owner : address ; const spender : address ; const contr : contract(amount) ; var s : contract_storage) : list(operation) is
 begin
  const src: account = get_force(owner, s.ledger);
  const destAllowance: amount = get_force(spender, src.allowances);
 end with list [transaction(destAllowance, 0tz, contr)]

// View function that forwards the balance of source to a contract
// Preconditions:
//  None
// Postconditions:
//  The state is unchanged
function getBalance (const accountFrom : address ; const contr : contract(amount) ; var s : contract_storage) : list(operation) is
 begin
  const src: account = get_force(accountFrom, s.ledger);
 end with list [transaction(src.balance, 0tz, contr)]

// View function that forwards the totalSupply to a contract
// Preconditions:
//  None
// Postconditions:
//  The state is unchanged
function getTotalSupply (const contr : contract(amount) ; var s : contract_storage) : list(operation) is
  list [transaction(s.totalSupply, 0tz, contr)]

function main (const p : action ; const s : contract_storage) :
  (list(operation) * contract_storage) is
 block { 
   // Reject any transaction that try to transfer token to this contract
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