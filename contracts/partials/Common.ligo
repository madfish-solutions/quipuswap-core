(* Helper function to get account *)
function get_account (const addr : address; const s : dex_storage) : account_info is
  case s.ledger[addr] of
    None -> record [
      balance    = 0n;
      frozen_balance   = 0n;
#if FA2_STANDARD_ENABLED
      allowances = (set [] : set (address));
#else
      allowances = (map [] : map(address, nat));
#endif
    ]
  | Some(instance) -> instance
  end;

(* Helper function to prepare the token transfer *)
function wrap_transfer_trx(const owner : address; const receiver : address; const value : nat; const s : dex_storage) : transfer_type is
#if FA2_STANDARD_ENABLED
  TransferType(list[
    record[
      from_ = owner;
      txs = list [ record [
          to_ = receiver;
          token_id = s.token_id;
          amount = value;
        ] ]
    ]
  ])
#else
  TransferType(owner, (receiver, value))
#endif

(* Helper function to get token contract *)
function get_token_contract(const token_address : address) : contract(transfer_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address) : option(contract(transfer_type))) of
    Some(contr) -> contr
    | None -> (failwith("Dex/not-token") : contract(transfer_type))
  end;

(* Helper function to get token contract *)
function get_validator_contract(const token_address : address) : contract(key_hash) is
  case (Tezos.get_entrypoint_opt("%validate", token_address) : option(contract(key_hash))) of
    Some(contr) -> contr
    | None -> (failwith("Dex/not-validator") : contract(key_hash))
  end;

(* Helper function to get voter info *)
function get_voter (const addr : address; const s : dex_storage) : vote_info is
  case s.voters[addr] of
    None -> record [
      candidate    = (None : option(key_hash));
      vote         = 0n;
      veto         = 0n;
      last_veto    = Tezos.now;
    ]
  | Some(instance) -> instance
  end;

(* Helper function to get user reward info *)
function get_user_reward_info (const addr : address; const s : dex_storage) : user_reward_info is
  case s.user_rewards[addr] of
    None -> record [
      reward         = 0n;
      reward_paid    = 0n;
    ]
  | Some(instance) -> instance
  end;


(* Helper function to update global rewards info *)
function update_reward (const s : dex_storage) : dex_storage is
  block {
    (* update loyalty info *)
    const rewards_time : timestamp = if Tezos.now > s.period_finish then
      s.period_finish
    else Tezos.now;
    const new_reward : nat = abs(rewards_time - s.last_update_time) * s.reward_per_sec;
    s.reward_per_share := s.reward_per_share + new_reward / s.total_supply;
    s.last_update_time := Tezos.now;

    (* update reward info *)
    if Tezos.now > s.period_finish then block {
      const periods_duration : int = ((Tezos.now - s.period_finish) / voting_period + 1) * voting_period;
      s.reward_per_sec :=  s.reward * accurancy_multiplier / abs(periods_duration);
      const new_reward : nat = abs(Tezos.now - s.period_finish) * s.reward_per_sec;
      s.period_finish := s.period_finish + periods_duration;
      s.reward_per_share := s.reward_per_share + new_reward / s.total_supply;
      s.reward := 0n;
      s.total_reward := s.total_reward + s.reward_per_sec * abs(periods_duration) / accurancy_multiplier;
    } else skip;
  } with s

(* Helper function to update user rewards info *)
function update_user_reward (const addr : address; const account: account_info; const new_balance: nat; const s : dex_storage) : dex_storage is
  block {
    var user_reward_info : user_reward_info := get_user_reward_info(addr, s);

    (* calculate user's reward *)
    const current_reward : nat = (account.balance + account.frozen_balance) * s.reward_per_share;
    user_reward_info.reward := user_reward_info.reward + abs(current_reward - user_reward_info.reward_paid);
    user_reward_info.reward_paid := new_balance * s.reward_per_share;

    (* update user's reward *)
    s.user_rewards[addr] := user_reward_info;
  } with s

#if FA2_STANDARD_ENABLED
#include "../partials/MethodFA2.ligo"
#else
#include "../partials/MethodFA12.ligo"
#endif
