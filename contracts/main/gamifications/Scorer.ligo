#include "../../partials/gamifications/IScorer.ligo"


function buy (const n : buy_params; const level : level_storage) : return is

  block{
    skip;
  } with ((nil : list (operation)), level)

function sell (const s : sell_params; const level : level_storage) : return is

  block {
    skip;
  } with ((nil : list (operation)), level)

function main (const action : game_action; const level : level_storage): return is
  case action of
    Buy (n) -> buy (n, level)
  | Sell (s) -> sell (s, level)
  end