#include "./IFactory.ligo"
#include "./MethodDex.ligo"

const create_dex : create_dex_func =
[%Michelson ( {| { UNPPAIIR ;
                  CREATE_CONTRACT 
#if FA2_STANDARD_ENABLED
#include "../main/DexFA2.tz"
#else
#include "../main/DexFA12.tz"
#endif
                  ;
                    PAIR } |}
           : create_dex_func)];
  
(* Create the pool contract for Tez-Token pair *)
function launch_exchange (const self : address; const token : token_identifier; const token_amount : nat; var s : exchange_storage) :  full_factory_return is
  block {
    if s.token_list contains token then 
      failwith("Factory/exchange-launched") 
    else skip;
    if Tezos.amount < 1mutez or token_amount < 1n then 
      failwith("Dex/not-allowed") 
    else skip; 
    s.token_list := Set.add (token, s.token_list);

    const storage : dex_storage = record [
#if FA2_STANDARD_ENABLED
      token_id = token.1;
#endif
      tez_pool = Tezos.amount / 1mutez;      
      token_pool = token_amount;      
      invariant = Tezos.amount / 1mutez * token_amount;      
      total_supply = 1000n; 
#if FA2_STANDARD_ENABLED
      token_address = token.0;      
#else
      token_address = token;      
#endif
      ledger = big_map[Tezos.sender -> record [
          balance = 1000n;
          frozen_balance = 0n;
#if FA2_STANDARD_ENABLED
          allowances = (set [] : set(address));
#else
          allowances = (map [] : map(address, nat));
#endif
        ]
      ];
      voters = (big_map [] : big_map(address, vote_info));      
      vetos = (big_map [] : big_map(key_hash, timestamp));      
      votes = (big_map [] : big_map(key_hash, nat));      
      veto = 0n;      
      last_veto = Tezos.now;
      current_delegated = (None: option(key_hash));      
      current_candidate = (None: option(key_hash));      
      total_votes = 0n;      
      reward_info = 
        record [
          reward = 0n;
          loyalty_per_share = 0n;
          last_update_time = Tezos.now;
          period_finish = Tezos.now;
          last_period_finish = Tezos.now;
          total_accomulated_loyalty = 0n;
          reward_per_token = 0n;    
          last_loyalty_per_share = 0n;    
        ];
      user_rewards = (big_map [] : big_map(address, user_reward_info));      
    ]; 
    const res : (operation * address) = create_dex((None : option(key_hash)), Tezos.amount, record [
      storage = storage;
      dex_lambdas = s.dex_lambdas;
      metadata = big_map["" -> 0x7b7d];
      token_lambdas = s.token_lambdas;
    ]);
    s.token_to_exchange[token] := res.1;
  } with (list[res.0;
    transaction(
      wrap_transfer_trx(Tezos.sender, res.1, token_amount, storage), 
      0mutez, 
#if FA2_STANDARD_ENABLED
      get_token_contract(token.0)
#else
      get_token_contract(token)
#endif
    )
  ], s)

(* Set the dex function code to factory storage *)
function set_dex_function (const idx : nat; const f : dex_func; const s : exchange_storage) : exchange_storage is
block {
  case s.dex_lambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.dex_lambdas[idx] := f 
  end;
} with s

(* Set the token function code to factory storage *)
function set_token_function (const idx : nat; const f : token_func; const s : exchange_storage) : exchange_storage is
block {
  case s.token_lambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.token_lambdas[idx] := f 
  end;
} with s

function main (const p : exchange_action; const s : exchange_storage) : full_factory_return is 
  case p of
    | LaunchExchange(params) -> launch_exchange(Tezos.self_address, params.token, params.token_amount, s)
    | SetDexFunction(params) -> ((nil:list(operation)), if params.index > 8n then (failwith("Factory/wrong-index") : exchange_storage) else set_dex_function(params.index, params.func, s))
    | SetTokenFunction(params) -> ((nil:list(operation)), if params.index > 4n then (failwith("Factory/wrong-index") : exchange_storage) else set_token_function(params.index, params.func, s))
  end
