(* Main function parameter types specific for FA1.2 standard*)
type transfer_params is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type approve_params is michelson_pair(address, "spender", nat, "value")
type balance_params is michelson_pair(address, "owner", contract(nat), "")
type allowance_params is michelson_pair(michelson_pair(address, "owner", address, "spender"), "", contract(nat), "")
type total_supply_params is (unit * contract(nat))

type token_action is
| ITransfer             of transfer_params
| IApprove              of approve_params
| IGetBalance           of balance_params
| IGetAllowance         of allowance_params
| IGetTotalSupply       of total_supply_params

type full_action is
| Use                   of use_params
| Default               of default_params
| Transfer              of transfer_params
| Approve               of approve_params
| GetBalance            of balance_params
| GetAllowance          of allowance_params
| GetTotalSupply        of total_supply_params
| GetReserves           of get_reserves_params
