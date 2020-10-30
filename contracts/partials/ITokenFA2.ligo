(* Define types *)
type token_id is nat
type account is
  record [
    balance         : nat;
    allowances      : set (address);
  ]

type token_metadata_info_r is 
  record [
    token_id  : token_id;
    symbol    : string;
    name      : string;
    decimals  : nat;
    extras    : map (string, string);
  ]

type token_metadata_info is michelson_pair_right_comb(token_metadata_info_r)
  
const default_token_id : token_id = 0n;

(* contract storage *)
type storage is
  record [
    safelist_contract   : option(address);
    total_supply        : nat;
    operators           : big_map ((address * address), unit);
    ledger              : big_map (address, account);
    token_metadata      : big_map (token_id, token_metadata_info);
  ]

type return is list (operation) * storage

type transfer_destination_r is 
  record
    to_       : address;
    token_id  : token_id;
    amount    : nat;
end

type transfer_destination is michelson_pair_right_comb(transfer_destination_r)

type transfer_param_r is 
  record [
    from_   : address;
    txs     : list (transfer_destination);
  ]

type transfer_param is michelson_pair_right_comb(transfer_param_r)

type balance_of_request_r is 
  record [
    owner       : address;
    token_id    : token_id;
  ]

type balance_of_response_r is 
  record [
    request     : balance_of_request_r;
    balance     : nat;
  ]

type balance_of_response is michelson_pair_right_comb(balance_of_response_r)

type balance_params_r is 
  record [
    requests    : list (balance_of_request_r); 
    callback    : contract (list (balance_of_response));
  ]

type operator_transfer_policy_r is
  | No_transfer
  | Owner_transfer
  | Owner_or_operator_transfer

type operator_transfer_policy is michelson_or_right_comb(operator_transfer_policy_r)

type owner_hook_policy_r is
  | Owner_no_hook
  | Optional_owner_hook
  | Required_owner_hook

type owner_hook_policy is michelson_or_right_comb(owner_hook_policy_r)

type custom_permission_policy_r is 
  record [
    tag           : string; 
    config_api    : option (address);
  ]

type custom_permission_policy is michelson_pair_right_comb(custom_permission_policy_r)

type permissions_descriptor_r is 
  record [
    operator     : operator_transfer_policy; 
    receiver     : owner_hook_policy; 
    sender       : owner_hook_policy; 
    custom       : option (custom_permission_policy);
  ]

type permissions_descriptor is michelson_pair_right_comb(permissions_descriptor_r)

type operator_param_r is 
  record [
    owner     : address; 
    operator  : address;
    token_id  : token_id;
  ]

type operator_param is michelson_pair_right_comb(operator_param_r)

type update_operator_param is
  | Add_operator    of operator_param
  | Remove_operator of operator_param

type transfer_params is list (transfer_param)
type balance_params is michelson_pair_right_comb(balance_params_r)
type token_metadata_registry_params is contract (address)
type permissions_descriptor_params is contract (permissions_descriptor)
type update_operator_params is list (update_operator_param)
// type isOperatorParams is michelson_pair_right_comb(isOperatorParams_)

type token_action is
  | Transfer                of transfer_params
  | Balance_of              of balance_params
  | Token_metadata_registry of token_metadata_registry_params
  // | Permissions_descriptor  of permissions_descriptor_params
  | Update_operators        of update_operator_params
