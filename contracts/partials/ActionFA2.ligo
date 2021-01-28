(* Main function parameter types specific for FA2 standard*)
type transfer_params is list (transfer_param)
type update_operator_params is list (update_operator_param)

type token_action is
| ITransfer                of transfer_params
| IBalance_of              of balance_params
| IUpdate_operators        of update_operator_params

type full_action is
| Use                     of use_params
| Default                 of default_params
| Transfer                of transfer_params
| Balance_of              of balance_params
| Update_operators        of update_operator_params
| Get_reserves            of get_reserves_params
