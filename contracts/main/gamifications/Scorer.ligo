#include "../../partials/gamifications/IScorer.ligo"
#include "../../partials/IDex.ligo"


function buy (const n : buy_params; const level : level_storage) : return_level is

  block{

  // fetch contract for buying
  const trading : contract(tez_to_token_payment_params) =
  case (Tezos.get_entrypoint_opt("%tez_to_token", level.trading_pair) : option (contract(tez_to_token_payment_params))) of
   Some (contract) -> contract
  |None -> (failwith("Level not found") : contract(tez_to_token_payment_params))
  end;

  // calculate score and update level_storage accordingly

  // create transaction operation
  const params : tez_to_token_payment_params = record [
    min_out = 1n;
    receiver = Tezos.self_address;
  ];

  const op : operation = Tezos.transaction(params, 0tez, trading);
  const operations : list(operation) = list[op];


  } with (operations, level)

function sell (const s : sell_params; const level : level_storage) : return_level is

  block {
    skip;
  } with ((nil : list (operation)), level)

function main (const action : game_action; const level : level_storage): return_level is
  case action of
    Buy (n) -> buy (n, level)
  | Sell (s) -> sell (s, level)
  end