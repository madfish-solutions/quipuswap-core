#include "../../partials/gamifications/IScorer.ligo"
#include "../../partials/IDex.ligo"


function buy (const purchase_quantity : buy_params; const level : level_storage) : return_level is

  block {

    // fetch contract for buying
    const trading : contract(tez_to_token_payment_params) =
    case (Tezos.get_entrypoint_opt("%tez_to_token", level.trading_pair) : option (contract(tez_to_token_payment_params))) of
    Some (contract) -> contract
    |None -> (failwith("Level not found") : contract(tez_to_token_payment_params))
    end;

    // calculate score and update level_storage accordingly
    // mint score on this address

    // create transaction operation args
    const params : tez_to_token_payment_params = record [
      min_out = 1n;
      receiver = level.owner;
    ];

    // add to operations list
    const op : operation = Tezos.transaction(params, purchase_quantity * 1mutez, trading);
    const operations : list(operation) = list[op];


  } with (operations, level)

function sell (const purchase_quantity : sell_params; const level : level_storage) : return_level is

  block {
    // fetch contract for selling
    const trading : contract(token_to_tez_payment_params) =
    case (Tezos.get_entrypoint_opt("%token_to_tez", level.trading_pair) : option (contract(token_to_tez_payment_params))) of
    Some (contract) -> contract
    |None -> (failwith("Level not found") : contract(token_to_tez_payment_params))
    end;

    // calculate score and update level_storage accordingly
    // mint score on this address

    // create transaction operation args
    const params : token_to_tez_payment_params = record [
      amount = purchase_quantity;
      min_out = 1n;
      receiver = level.owner;
    ];

    // add to operations list
    const op : operation = Tezos.transaction(params, 0tez, trading);
    const operations : list(operation) = list[op];

  } with (operations, level)

function main (const action : game_action; const level : level_storage): return_level is
  case action of
    Buy (x) -> buy (x, level)
  | Sell (x) -> sell (x, level)
  end