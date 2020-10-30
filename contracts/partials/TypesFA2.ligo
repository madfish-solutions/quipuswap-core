type token_id is nat

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