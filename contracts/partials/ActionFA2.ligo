type transfer_params is list (transfer_param)
type token_metadata_registry_params is contract (address)
type update_operator_params is list (update_operator_param)
// type prices_params is (nat * contract(nat * nat * nat * nat))
type reserve_params is (unit * contract(nat * nat))

type token_action is
| ITransfer                of transfer_params
| IBalance_of              of balance_params
| IToken_metadata_registry of token_metadata_registry_params
| IUpdate_operators        of update_operator_params

type full_action is
| Use                     of use_params
| Default                 of default_params
| Transfer                of transfer_params
| Balance_of              of balance_params
| Token_metadata_registry of token_metadata_registry_params
| Update_operators        of update_operator_params
// | GetPrices               of prices_params
// | GetReserves             of reserve_params