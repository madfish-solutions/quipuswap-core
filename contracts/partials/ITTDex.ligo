#include "./TypesFA2.ligo"

(* Storage types *)

(* record that represents account shares *)
type account_info is record [
  balance           : nat; (* LP tokens *)
  allowances        : set (address); (* accounts allowed to act on behalf of the user *)
]

type token_transfer_params_fa2 is list (transfer_param)
type token_identifier_fa2 is record [
  token_address     : address;
  token_id          : nat;
]
type token_transfer_params_fa12 is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type token_identifier_fa12 is address
type transfer_type_fa12 is TransferTypeFA12 of token_transfer_params_fa12
type transfer_type_fa2 is TransferTypeFA2 of token_transfer_params_fa2
type balance_of_fa12_params is address * contract(nat)
type balance_of_fa12_type   is BalanceOfTypeFA12 of balance_of_fa12_params
type balance_of_fa2_type    is BalanceOfTypeFA2 of balance_params

type token_type is
| Fa12
| Fa2

type token_name is
| A
| B

type pair_info is record [
  token_a_pool        : nat; (* token A reserves in the pool *)
  token_b_pool        : nat; (* token B reserves in the pool *)
  total_supply        : nat; (* total shares count *)
]

type tokens_info is record [
  token_a_address        : address; (* token A address *)
  token_b_address        : address; (* token B address *)
  token_a_id             : nat; (* token A identifier *)
  token_b_id             : nat; (* token B identifier *)
  token_a_type           : token_type; (* token A standard *)
  token_b_type           : token_type; (* token B standard *)
]

type token_pair is bytes

type balance_info is record [
  balance_a             : option (nat);
  balance_b             : option (nat);
]

(* record for the dex storage_type *)
type dex_storage is record [
  entered             : bool; (* reentrancy protection *)
  tmp                 : balance_info;
  pairs_count         : nat; (* total shares count *)
  tokens              : big_map(nat, tokens_info); (* all the tokens list *)
  token_to_id         : big_map(token_pair, nat); (* all the tokens list *)
  pairs               : big_map(nat, pair_info); (* account info per address *)
  ledger              : big_map((address * nat), account_info); (* account info per address *)
]
(* operation type *)
type swap_type is
| Sell (* exchange token A to token B *)
| Buy (* exchange token B to token A *)

type swap_slice_type is record [
    pair                  : tokens_info; (* exchange pair info *)
    operation             : swap_type; (* exchange operation *)
]

type swap_side is record [
  pool                    : nat; (* pair identifier*)
  token                   : address; (* token address*)
  id                      : nat; (* token aidentifier *)
  standard                : token_type; (* token standard *)
]

type swap_data is record [
  to_                     : swap_side; (* info about sold asset *)
  from_                   : swap_side; (* info about bought asset *)
]

type internal_swap_type is record [
  s                       : dex_storage; (* storage_type state *)
  amount_in               : nat; (* amount of tokens to be sold *)
  token_address_in        : address; (* address of sold token *)
  token_id_in             : nat; (* identifier of sold token *)
  operation               : option(operation); (* exchange operation type *)
  sender                  : address; (* address of the sender *)
  receiver                : address; (* address of the receiver *)
]

(* Entrypoint arguments *)
type token_to_token_route_params is
  [@layout:comb]
  record [
    swaps                 : list(swap_slice_type); (* swap operations list*)
    amount_in             : nat; (* amount of tokens to be exchanged *)
    min_amount_out        : nat; (* min amount of tokens received to accept exchange *)
    receiver              : address; (* tokens receiver *)
  ]

type ensured_route_params is
  [@layout:comb]
  record [
    swaps                 : list(swap_slice_type); (* swap operations list*)
    min_amount_out        : nat; (* min amount of tokens received to accept exchange *)
    receiver              : address; (* tokens receiver *)
  ]

type initialize_params is
  [@layout:comb]
  record [
    pair            : tokens_info; (* exchange pair info *)
    token_a_in      : nat; (* min amount of tokens A invested  *)
    token_b_in      : nat; (* min amount of tokens B invested *)
  ]

type invest_liquidity_params is
  [@layout:comb]
  record [
    pair            : tokens_info; (* exchange pair info *)
    shares          : nat; (* the amount of shares to receive *)
    token_a_in      : nat; (* min amount of tokens A invested  *)
    token_b_in      : nat; (* min amount of tokens B invested *)
  ]

type ensured_invest_params is
  [@layout:comb]
  record [
    pair            : tokens_info; (* exchange pair info *)
    receiver            : address; (* exchange pair info *)
    shares          : nat; (* the amount of shares to receive *)
  ]

type ensured_add_params is
  [@layout:comb]
  record [
    pair            : tokens_info; (* exchange pair info *)
    receiver        : address; (* exchange pair info *)
  ]

type divest_liquidity_params is
  [@layout:comb]
  record [
    pair                 : tokens_info; (* exchange pair info *)
    min_token_a_out      : nat; (* min amount of tokens A received to accept the divestment *)
    min_token_b_out      : nat; (* min amount of tokens B received to accept the divestment *)
    shares               : nat; (* amount of shares to be burnt *)
  ]

type dex_action is
(* User's entrypoints *)
| AddPair                 of initialize_params  (* sets initial liquidity *)
| Swap                    of token_to_token_route_params  (* exchanges token to another token and sends them to receiver *)
| Invest                  of invest_liquidity_params  (* mints min shares after investing tokens *)
| Divest                  of divest_liquidity_params  (* burns shares and sends tokens to the owner *)
(* For internal usage*)
| EnsuredAddPair          of ensured_add_params  (* sets initial liquidity *)
| EnsuredSwap             of ensured_route_params  (* exchanges token to another token and sends them to receiver *)
| EnsuredInvest           of ensured_invest_params  (* mints min shares after investing tokens *)

type balance_action is
(* Callback *)
| IBalanceAFA12            of nat (* process token balance *)
| IBalanceBFA12            of nat (* process token balance *)
| IBalanceAFA2             of list(balance_of_response) (* process token balance *)
| IBalanceBFA2             of list(balance_of_response) (* process token balance *)

type use_params is dex_action
type get_reserves_params is record [
  receiver        : contract(nat * nat); (* response receiver *)
  pair_id         : nat; (* pair identifier *)
]

(* Main function parameter types specific for FA2 standard*)
type transfer_params is list (transfer_param)
type update_operator_params is list (update_operator_param)

type token_action is
| ITransfer                of transfer_params (* transfer asset from one account to another *)
| IBalance_of              of balance_params (* returns the balance of the account *)
| IUpdate_operators        of update_operator_params (* updates the token operators *)

type return_type is list (operation) * dex_storage
type dex_func is (dex_action * dex_storage * address) -> return_type
type token_func is (token_action * dex_storage * address) -> return_type
type bal_func is (balance_action * dex_storage * address) -> return_type

type set_token_function_params is record [
  func    : token_func; (* code of the function *)
  index   : nat; (* the key in functions map *)
]
type set_bal_function_params is record [
  func    : bal_func; (* code of the function *)
  index   : nat; (* the key in functions map *)
]

type set_dex_function_params is record [
  func    : dex_func; (* code of the function *)
  index   : nat; (* the key in functions map *)
]

(* full list of dex entrypoints *)
type full_action is
| Use                     of use_params
| Transfer                of transfer_params (* transfer asset from one account to another *)
| Balance_of              of balance_params (* returns the balance of the account *)
| Update_operators        of update_operator_params (* updates the token operators *)
| Get_reserves            of get_reserves_params (* returns the underlying token reserves *)
| Close                   of unit (* entrypoint to prevent reentrancy *)
| BalanceAFA12            of nat (* process token balance *)
| BalanceBFA12            of nat (* process token balance *)
| BalanceAFA2             of list(balance_of_response) (* process token balance *)
| BalanceBFA2             of list(balance_of_response) (* process token balance *)
| SetDexFunction          of set_dex_function_params (* sets the dex specific function. Is used before the whole system is launched *)
| SetTokenFunction        of set_token_function_params (* sets the FA function, is used before the whole system is launched *)
| SetBalanceFunction      of set_bal_function_params (* sets the FA function, is used before the whole system is launched *)

(* real dex storage_type *)
type full_dex_storage is record
  storage_type             : dex_storage; (* real dex storage_type *)
  metadata            : big_map(string, bytes); (* metadata storage_type according to TZIP-016 *)
  dex_lambdas         : big_map(nat, dex_func); (* map with exchange-related functions code *)
  token_lambdas       : big_map(nat, token_func); (* map with token-related functions code *)
  balance_lambdas     : big_map(nat, bal_func); (* map with token-related functions code *)
end

type full_return is list (operation) * full_dex_storage

const fee_rate : nat = 333n; (* exchange fee rate distributed among the liquidity providers *)

