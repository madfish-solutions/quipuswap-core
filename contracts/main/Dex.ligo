#include "../partials/Errors.ligo"
#include "../partials/IDex.ligo"
#include "../partials/Utils.ligo"
#include "../partials/MethodsFA2.ligo"
#include "../partials/MethodsDex.ligo"
#include "../partials/Dex.ligo"

const initial_storage : full_storage_type = record [
  storage       = record [
    entered       = False;
    pairs_count   = 0n;
    tokens        = (big_map[] : big_map(nat, tokens_type));
    token_to_id   = (big_map[] : big_map(bytes, nat));
    pairs         = (big_map[] : big_map(nat, pair_type));
    ledger        = (big_map[] : big_map((address * nat), account_info));
  ];
  metadata      = big_map[
    "" -> 0x74657a6f732d73746f726167653a7175697075;
    "quipu" -> 0x7b2276657273696f6e223a2276302e302e31222c226465736372697074696f6e223a2251756970757377617020536861726520506f6f6c20546f6b656e222c226e616d65223a225175697075204c5020546f6b656e222c22617574686f7273223a5b224d6164666973682e536f6c7574696f6e73203c696e666f406d6164666973682e736f6c7574696f6e733e225d2c22686f6d6570616765223a2268747470733a2f2f7175697075737761702e636f6d2f222c22736f75726365223a7b22746f6f6c73223a5b224c69676f222c22466c657874657361225d2c226c6f636174696f6e223a2268747470733a2f2f6c69676f6c616e672e6f72672f227d2c22696e7465726661636573223a5b22545a49502d3132222c22545a49502d3136225d7d;
  ];
  token_metadata = (big_map[] : big_map(nat, token_metadata_info));
  dex_lambdas   = big_map[
    0n -> initialize_exchange;
    1n -> token_to_token_route;
    2n -> invest_liquidity;
    3n -> divest_liquidity;
  ];
  token_lambdas = big_map[
    0n -> transfer;
    1n -> update_operators;
    2n -> get_balance_of;
  ];
];

(* Dex - Contract for exchanges between FA12 and FA2 tokens *)
function main(
  const p               : full_action_type;
  const s               : full_storage_type)
                        : full_return_type is
  case p of
    Use(params)                -> call_dex(params, s)
  | Transfer(params)           -> call_token(ITransfer(params), 0n, s)
  | Balance_of(params)         -> call_token(IBalance_of(params), 2n, s)
  | Update_operators(params)   -> call_token(IUpdate_operators(params), 1n, s)
  | Get_reserves(params)       -> get_reserves(params, s)
  | Close                      -> ((nil:list(operation)), close(s))
  end

