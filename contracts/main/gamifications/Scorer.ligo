#include "../../partials/gamifications/IScorer.ligo"


type storage is record [
  counter : nat;
  name    : string
]

type return is list (operation) * storage

function buy (const n : buy_params; const store : storage) : return is
  ((nil : list (operation)), store with record [counter = 0n])

function sell (const s : sell_params; const store : storage) : return is
  ((nil : list (operation)), store with record [name = "hi"])

function main (const action : game_action; const store : storage): return is
  case action of
    Buy (n) -> buy (n, store)
  | Sell (s) -> sell (s, store)
  end