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
    total_supply              : nat;
    ledger                    : big_map (address, account);
    token_metadata            : big_map (token_id, token_metadata_info);
  ]

type return is list (operation) * storage

type transfer_destination_r is 
  record [
    to_       : address;
    token_id  : token_id;
    amount    : nat;
  ]

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
type update_operator_params is list (update_operator_param)

type token_action is
| Transfer                of transfer_params
| Balance_of              of balance_params
| Token_metadata_registry of token_metadata_registry_params
| Update_operators        of update_operator_params
