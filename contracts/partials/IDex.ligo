#include "./TypesFA2.ligo"

type account_info       is record [
  balance                 : nat; (* LP tokens *)
  allowances              : set (address); (* accounts allowed to act on behalf of the user *)
]

type transfer_fa2_type  is list (transfer_param)
type transfer_fa12_type is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type entry_fa12_type    is TransferTypeFA12 of transfer_fa12_type
type entry_fa2_type     is TransferTypeFA2 of transfer_fa2_type
type bal_fa12_type      is address * contract(nat)
type balance_fa12_type  is BalanceOfTypeFA12 of bal_fa12_type
type balance_fa2_type   is BalanceOfTypeFA2 of bal_fa2_type

type fa2_token_type     is record [
  token_address           : address; (* token A address *)
  token_id                : nat; (* token A identifier *)
]

type token_type        is
| Fa12                    of address
| Fa2                     of fa2_token_type

type token_name         is
| A
| B

type pair_type          is record [
  token_a_pool            : nat; (* token A reserves in the pool *)
  token_b_pool            : nat; (* token B reserves in the pool *)
  total_supply            : nat; (* total shares count *)
]

type tokens_type        is record [
  token_a_type            : token_type; (* token A standard *)
  token_b_type            : token_type; (* token B standard *)
]

type storage_type       is record [
  entered                 : bool; (* reentrancy protection *)
  pairs_count             : nat; (* total shares count *)
  tokens                  : big_map(nat, tokens_type); (* all the tokens list *)
  token_to_id             : big_map(bytes, nat); (* all the tokens list *)
  pairs                   : big_map(nat, pair_type); (* pair info per token id *)
  ledger                  : big_map((address * nat), account_info); (* account info per address *)
]

type swap_type          is
| A_to_b (* exchange token A to token B *)
| B_to_a (* exchange token B to token A *)

type swap_slice_type    is record [
  pair_id                 : nat; (* pair identifier *)
  operation               : swap_type; (* exchange operation *)
]

type swap_side_type     is record [
  pool                    : nat; (* pair identifier*)
  token                   : token_type; (* token standard *)
]

type swap_data_type     is record [
  to_                     : swap_side_type; (* info about sold asset *)
  from_                   : swap_side_type; (* info about bought asset *)
]

type tmp_swap_type      is record [
  s                       : storage_type; (* storage_type state *)
  amount_in               : nat; (* amount of tokens to be sold *)
  token_in                : token_type; (* type of sold token *)
  operation               : option(operation); (* exchange operation type *)
  receiver                : address; (* address of the receiver *)
]

type route_type         is [@layout:comb] record [
  swaps                   : list(swap_slice_type); (* swap operations list*)
  amount_in               : nat; (* amount of tokens to be exchanged *)
  min_amount_out          : nat; (* min amount of tokens received to accept exchange *)
  receiver                : address; (* tokens receiver *)
]

type initialize_params  is [@layout:comb] record [
  pair                    : tokens_type; (* exchange pair info *)
  token_a_in              : nat; (* min amount of tokens A invested  *)
  token_b_in              : nat; (* min amount of tokens B invested *)
]

type invest_type        is [@layout:comb] record [
  pair_id                 : nat; (* pair identifier *)
  shares                  : nat; (* the amount of shares to receive *)
  token_a_in              : nat; (* min amount of tokens A invested  *)
  token_b_in              : nat; (* min amount of tokens B invested *)
]

type divest_type        is [@layout:comb] record [
  pair_id                 : nat; (* pair identifier *)
  min_token_a_out         : nat; (* min amount of tokens A received to accept the divestment *)
  min_token_b_out         : nat; (* min amount of tokens B received to accept the divestment *)
  shares                  : nat; (* amount of shares to be burnt *)
]

type action_type        is
  AddPair                 of initialize_params  (* sets initial liquidity *)
| Swap                    of route_type  (* exchanges token to another token and sends them to receiver *)
| Invest                  of invest_type  (* mints min shares after investing tokens *)
| Divest                  of divest_type  (* burns shares and sends tokens to the owner *)

type reserves_type      is record [
  receiver                : contract(nat * nat); (* response receiver *)
  pair_id                 : nat; (* pair identifier *)
]

type transfer_type      is list (transfer_param)
type operator_type      is list (update_operator_param)

type token_action_type  is
  ITransfer               of transfer_type (* transfer asset from one account to another *)
| IBalance_of             of bal_fa2_type (* returns the balance of the account *)
| IUpdate_operators       of operator_type (* updates the token operators *)

type return_type        is list (operation) * storage_type
type dex_func_type      is (action_type * storage_type) -> return_type
type token_func_type    is (token_action_type * storage_type) -> return_type

type set_token_func_type is record [
  func                    : token_func_type; (* code of the function *)
  index                   : nat; (* the key in functions map *)
]

type set_dex_func_type  is record [
  func                    : dex_func_type; (* code of the function *)
  index                   : nat; (* the key in functions map *)
]

type full_action_type   is
| Use                     of action_type
| Transfer                of transfer_type (* transfer asset from one account to another *)
| Balance_of              of bal_fa2_type (* returns the balance of the account *)
| Update_operators        of operator_type (* updates the token operators *)
| Get_reserves            of reserves_type (* returns the underlying token reserves *)
| Close                   of unit (* entrypoint to prevent reentrancy *)
| SetDexFunction          of set_dex_func_type (* sets the dex specific function. Is used before the whole system is launched *)
| SetTokenFunction        of set_token_func_type (* sets the FA function, is used before the whole system is launched *)

type full_storage_type  is record [
  storage                 : storage_type; (* real dex storage_type *)
  metadata                : big_map(string, bytes); (* metadata storage_type according to TZIP-016 *)
  dex_lambdas             : big_map(nat, dex_func_type); (* map with exchange-related functions code *)
  token_lambdas           : big_map(nat, token_func_type); (* map with token-related functions code *)
]

type full_return_type   is list (operation) * full_storage_type

const fee_rate          : nat = 333n;
const dex_func_count    : nat = 3n;
const token_func_count  : nat = 2n;
const fee_denom         : nat = 1000n;
const fee_num           : nat = 997n;
