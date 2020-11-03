type token_id is nat

type token_metadata_info is
  [@layout:comb] 
  record [
    token_id  : token_id;
    symbol    : string;
    name      : string;
    decimals  : nat;
    extras    : map (string, string);
  ]
  
const default_token_id : token_id = 0n;

type transfer_destination is
  [@layout:comb] 
  record
    to_       : address;
    token_id  : token_id;
    amount    : nat;
end

type transfer_param is
  [@layout:comb] 
  record [
    from_   : address;
    txs     : list (transfer_destination);
  ]

type balance_of_request is 
  [@layout:comb]
  record [
    owner       : address;
    token_id    : token_id;
  ]

type balance_of_response is 
  [@layout:comb]
  record [
    request     : balance_of_request;
    balance     : nat;
  ]

type balance_params is 
  [@layout:comb]
  record [
    requests    : list (balance_of_request); 
    callback    : contract (list (balance_of_response));
  ]

type operator_param is 
  [@layout:comb]
  record [
    owner     : address; 
    operator  : address;
    token_id  : token_id;
  ]

type update_operator_param is
  | Add_operator        of operator_param
  | Remove_operator     of operator_param