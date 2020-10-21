(* Implimentation of the mintable/burnable FA1.2 specification in PascaLIGO *)

(* Define types *)
type trusted is address
type amt is nat

type account is
  record [
    balance         : amt;
    allowances      : map (trusted, amt);
  ]

(* contract storage *)
type storage is
  record [
    totalSupply     : amt;
    ledger          : big_map (address, account);
    minters         : set (address);
    admin           : address;
  ]

(* define return for readability *)
type return is list (operation) * storage

(* define noop for readability *)
const noOperations : list (operation) = nil;

(* Inputs *)
type transferParams is michelson_pair(address, "from", michelson_pair(address, "to", amt, "value"), "")
type approveParams is michelson_pair(trusted, "spender", amt, "value")
type balanceParams is michelson_pair(address, "owner", contract(amt), "")
type allowanceParams is michelson_pair(michelson_pair(address, "owner", trusted, "spender"), "", contract(amt), "")
type totalSupplyParams is (unit * contract(amt))
type mintParams is michelson_pair(address, "to", amt, "value")
type burnParams is michelson_pair(address, "from", amt, "value")
type minterParams is michelson_pair(address, "owner", bool, "status")
type adminParams is address

(* Valid entry points *)
type tokenAction is
  | Mint of mintParams
  | Burn of burnParams
  | SetMinter of minterParams
  | SetAdmin of adminParams
  | Transfer of transferParams
  | Approve of approveParams
  | GetBalance of balanceParams
  | GetAllowance of allowanceParams
  | GetTotalSupply of totalSupplyParams
