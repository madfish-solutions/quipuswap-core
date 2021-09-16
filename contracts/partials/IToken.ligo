(* Implimentation of the FA1.2 specification in PascaLIGO *)

(* Define types *)
type trusted            is address
type amt is nat

type account            is record [
  balance                 : amt;
  allowances              : map (trusted, amt);
]

(* contract storage_type *)
type storage_type       is record [
  total_supply            : amt;
  ledger                  : big_map (address, account);
]

(* define return_type for readability *)
type return_type        is list (operation) * storage_type

(* define noop for readability *)
const noOperations : list (operation) = nil;

(* Inputs *)
type transferParams is michelson_pair(address, "from", michelson_pair(address, "to", amt, "value"), "")
type approveParams is michelson_pair(trusted, "spender", amt, "value")
type balanceParams is michelson_pair(address, "owner", contract(amt), "")
type allowanceParams is michelson_pair(michelson_pair(address, "owner", trusted, "spender"), "", contract(amt), "")
type totalSupplyParams is (unit * contract(amt))

(* Valid entry points *)
type tokenAction is
| Transfer        of transferParams
| Approve         of approveParams
| GetBalance      of balanceParams
| GetAllowance    of allowanceParams
| GetTotalSupply  of totalSupplyParams
