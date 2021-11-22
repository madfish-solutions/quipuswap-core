(* achivements *)
type badge is
| Bronze
| Silver
| Gold
| Platnum
| Osmium

type ranks is map (nat, badge)

type buy_params is nat
type sell_params is nat

(* gamification features *)
type game_action is
| Buy of buy_params
| Sell of sell_params

(* main storage, also acts as score treasury *)
type level_storage is record [
    trading_pair : address; // contract of quipu contract
    score_token : address;  // contract of score token
    score : nat;
    streak : nat;
    current_rank : nat;
    possible_ranks : ranks;
    multiplier : nat;
    owner : address;
]

type return_level is list (operation) * level_storage


