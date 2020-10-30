(* Define types *)
type token_id is nat
type account is
  record [
    balance         : nat;
    allowances      : set (address);
  ]

type tokenMetadataInfo_ is 
  record [
    token_id  : token_id;
    symbol    : string;
    name      : string;
    decimals  : nat;
    extras    : map (string, string);
  ]

type tokenMetadataInfo is michelson_pair_right_comb(tokenMetadataInfo_)
  
const defaultTokenId : token_id = 0n;

(* contract storage *)
type storage is
  record [
    safelistContract    : option(address);
    totalSupply         : nat;
    operators           : big_map ((address * address), unit);
    ledger              : big_map (address, account);
    tokenMetadata       : big_map (token_id, tokenMetadataInfo);
  ]

type return is list (operation) * storage

type transferDestination_ is 
  record
    to_       : address;
    token_id  : token_id;
    amount    : nat;
end

type transferDestination is michelson_pair_right_comb(transferDestination_)

type transferParam_ is 
  record [
    from_   : address;
    txs     : list (transferDestination);
  ]

type transferParam is michelson_pair_right_comb(transferParam_)

type balanceOfRequest is 
  record [
    owner       : address;
    token_id    : token_id;
  ]

type balanceOfResponse_ is 
  record [
    request     : balanceOfRequest;
    balance     : nat;
  ]

type balanceOfResponse is michelson_pair_right_comb(balanceOfResponse_)

type balanceParams_ is 
  record [
    requests    : list (balanceOfRequest); 
    callback    : contract (list (balanceOfResponse));
  ]

type operatorTransferPolicy_ is
  | No_transfer
  | Owner_transfer
  | Owner_or_operator_transfer

type operatorTransferPolicy is michelson_or_right_comb(operatorTransferPolicy_)

type ownerHookPolicy_ is
  | Owner_no_hook
  | Optional_owner_hook
  | Required_owner_hook

type ownerHookPolicy is michelson_or_right_comb(ownerHookPolicy_)

type customPermissionPolicy_ is 
  record [
    tag           : string; 
    config_api    : option (address);
  ]

type customPermissionPolicy is michelson_pair_right_comb(customPermissionPolicy_)

type permissionsDescriptor_ is 
  record [
    operator     : operatorTransferPolicy; 
    receiver     : ownerHookPolicy; 
    sender       : ownerHookPolicy; 
    custom       : option (customPermissionPolicy);
  ]

type permissionsDescriptor is michelson_pair_right_comb(permissionsDescriptor_)

type operatorParam_ is 
  record [
    owner     : address; 
    operator  : address;
    token_id  : token_id;
  ]

type operatorParam is michelson_pair_right_comb(operatorParam_)

type updateOperatorParam is
  | Add_operator    of operatorParam
  | Remove_operator of operatorParam


// type isOperatorResponse_ is record [
//   operator      : operatorParam; 
//   is_operator   : bool;
// ]

// type isOperatorResponse is michelson_pair_right_comb(isOperatorResponse_)

// type isOperatorParams_ is 
//   record [
//     operator : operatorParam; 
//     callback : contract (isOperatorResponse);
//   ]




type transferParams is list (transferParam)
type balanceParams is michelson_pair_right_comb(balanceParams_)
type tokenMetadataRegistryParams is contract (address)
type permissionsDescriptorParams is contract (permissionsDescriptor)
type updateOperatorParams is list (updateOperatorParam)
// type isOperatorParams is michelson_pair_right_comb(isOperatorParams_)

type tokenAction is
  | Transfer                of transferParams
  | Balance_of              of balanceParams
  // | Token_metadata_registry of tokenMetadataRegistryParams
  // | Permissions_descriptor  of permissionsDescriptorParams
  | Update_operators        of updateOperatorParams
