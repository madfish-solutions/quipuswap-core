(* achivements *)
type badge is
| Bronze
| Silver
| Gold
| Platnum
| Osmium

type ranks is map (nat, badge)

type buy_params is (address * nat)
type sell_params is (address * nat)

(* gamification features *)
type game_action is
| Buy of buy_params
| Sell of sell_params

(* main storage *)
type level_storage is record [
    trading_pair : address;
    score : nat;
    streak : nat;
    current_rank : nat;
    possible_ranks : ranks;
    multiplier : nat;
]

type return_level is list (operation) * level_storage


