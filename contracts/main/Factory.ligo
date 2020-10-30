#include "../partials/IFactory.ligo"

// types for internal transaction calls
type transfer_type is TransferType of michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")

(* Helper function to get token contract *)
function get_token_contract(const token_address : address) : contract(transfer_type) is 
  case (Tezos.get_entrypoint_opt("%transfer", token_address) : option(contract(transfer_type))) of 
    Some(contr) -> contr
    | None -> (failwith("01"):contract(transfer_type))
  end;


(* Helper function to get voter info *)
function get_voter (const addr : address; const s : dex_storage) : vote_info is
  block {
    var acct : vote_info :=
      record [
        candidate   = (None : option(key_hash));
        vote        = 0n;
        veto        = 0n;
        last_veto    = Tezos.now;
      ];
    case s.voters[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Helper function to get user reward info *)
function get_user_reward_info (const addr : address; const s : dex_storage) : user_reward_info is
  block {
    var acct : user_reward_info :=
      record [
        reward        = 0n;
        reward_paid    = 0n;
        loyalty       = 0n;
        loyalty_paid   = 0n;
        update_time    = Tezos.now;
      ];
    case s.user_rewards[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct


(* Helper function to update global rewards info *)
function update_reward (const s : dex_storage) : dex_storage is
  block {
    (* update rewards info *)
    const new_loyalty : nat = abs(Tezos.now - s.reward_info.last_update_time) * accurancy_multiplier;
    s.reward_info.loyalty_per_share := s.reward_info.loyalty_per_share + new_loyalty / s.total_supply;
    s.reward_info.total_accomulated_loyalty :=  s.reward_info.total_accomulated_loyalty + new_loyalty; 
    s.reward_info.last_update_time := Tezos.now;

    (* check reward update*)
    if Tezos.now > s.reward_info.period_finish then block {
      s.reward_info.reward_per_token := s.reward_info.reward_per_token + s.reward_info.reward * accurancy_multiplier * accurancy_multiplier / s.reward_info.total_accomulated_loyalty;
      s.reward_info.last_loyalty_per_share :=  s.reward_info.loyalty_per_share;
      s.reward_info.last_period_finish := Tezos.now;
      s.reward_info.period_finish := Tezos.now + voting_period;
      s.reward_info.reward := 0n;
    } else skip;
  } with s

(* Helper function to update user rewards info *)
function update_user_reward (const addr : address; const account: account_info; const new_balance: nat; const s : dex_storage) : dex_storage is
  block {
    var user_reward_info : user_reward_info := get_user_reward_info(addr, s);

    (* update user reward *)
    if s.reward_info.last_period_finish >= user_reward_info.update_time then {
      const prev_loyalty : nat = user_reward_info.loyalty + abs((account.balance + account.frozen_balance) * s.reward_info.last_loyalty_per_share - user_reward_info.loyalty_paid);
      const current_reward : nat = prev_loyalty * abs(s.reward_info.reward_per_token - user_reward_info.reward_paid) / accurancy_multiplier;
      user_reward_info := record [
        reward        = user_reward_info.reward + current_reward;
        reward_paid    = s.reward_info.reward_per_token;
        loyalty       = prev_loyalty;
        loyalty_paid   = (account.balance + account.frozen_balance) * s.reward_info.last_loyalty_per_share;
        update_time    = Tezos.now;
      ];
    } else skip;
    
    const current_loyalty : nat = (account.balance + account.frozen_balance) * s.reward_info.loyalty_per_share;
    user_reward_info.loyalty := user_reward_info.loyalty + abs(current_loyalty - user_reward_info.loyalty_paid);
    user_reward_info.loyalty_paid := new_balance * s.reward_info.loyalty_per_share;

    s.user_rewards[addr] := user_reward_info;
  } with s

#if FA2_STANDARD_ENABLED
#include "../partials/MethodFA2.ligo"
#else
#include "../partials/MethodFA12.ligo"
#endif

(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange (const p : dex_action ; const s : dex_storage ; const this: address) :  return is
  block {
    var operations : list(operation) := list[];
      case p of
        | InitializeExchange(token_amount) -> {
          if s.invariant =/= 0n 
            or s.total_supply =/= 0n 
            or Tezos.amount < 1mutez 
            or token_amount < 1n then 
            failwith("Dex/not-allowed")
          else skip; 
          s.token_pool := token_amount;
          s.tez_pool := Tezos.amount / 1mutez;
          s.invariant := s.tez_pool * s.token_pool;
          s.ledger[Tezos.sender] := record [
              balance    = 1000n;
              frozen_balance    = 0n;
              allowances = (map [] : map (address, nat));
            ];
          s.total_supply := 1000n; 

          (* update rewards info *)
          s.reward_info := record [
              reward = 0n;
              loyalty_per_share = 0n;
              last_update_time = Tezos.now;
              period_finish = Tezos.now;
              last_period_finish = Tezos.now;
              total_accomulated_loyalty = 0n;
              reward_per_token = 0n;    
              last_loyalty_per_share = 0n;    
            ];
          
          operations := list[ transaction(
            TransferType(Tezos.sender, (this, token_amount)), 
            0mutez, 
            get_token_contract(s.token_address)
          )];
        }
        | TezToTokenPayment(n) -> failwith("00")
        | TokenToTezPayment(n) -> failwith("00")
        | InvestLiquidity(n) -> failwith("00")
        | DivestLiquidity(n) -> failwith("00")
        | Vote(n) -> failwith("00")
        | Veto(n) -> failwith("00")
        | WithdrawProfit(n) -> failwith("00")
      end
  } with (operations, s)

(* Vote for the baker by freezing shares *)
function vote (const p : dex_action; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(token_amount) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | Vote(args) -> {
        case s.ledger[args.voter] of 
          | None -> failwith ("Dex/no-shares")
          | Some(account) -> {
            const share : nat = account.balance;
            case s.vetos[args.candidate] of None -> skip
              | Some(c) -> if c > Tezos.now then 
                  failwith ("Dex/veto-candidate") 
                else 
                  remove args.candidate from map s.vetos
            end; 

            const voter_info : vote_info = get_voter(args.voter, s);
            if account.balance + voter_info.vote < args.value then
              failwith("Dex/not-enough-balance")
            else skip;
            if args.voter =/= Tezos.sender then block {
              const spender_allowance : nat = get_allowance(account, Tezos.sender, s);
              if spender_allowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spender_allowance - args.value);
            } else skip;
            
            (* remove prev *)
            case voter_info.candidate of 
              | None -> skip
              | Some(candidate) -> 
                case s.votes[candidate] of 
                  | None -> failwith("Dex/no-votes") 
                  | Some(v) -> 
                    s.votes[candidate] := abs(v - voter_info.vote)
                end
            end;

            account.balance := abs(account.balance + voter_info.vote - args.value);
            account.frozen_balance := abs(account.frozen_balance - voter_info.vote + args.value);
            s.ledger[args.voter] := account;
            s.total_votes := abs(s.total_votes + args.value - voter_info.vote);
            voter_info.candidate := Some(args.candidate);
            voter_info.vote := args.value;
            s.voters[args.voter] := voter_info;

            const new_votes: nat = (case s.votes[args.candidate] of  None -> 0n | Some(v) -> v end) + args.value;
            s.votes[args.candidate] := new_votes;
            if case s.current_candidate of None -> True 
              | Some(candidate) -> (case s.votes[candidate] of None -> 0n | Some(v) -> v end) < new_votes
              end then if case s.current_delegated of
                | None -> True
                | Some(current) -> (case s.votes[current] of None -> 0n | Some(v) -> v end) < new_votes
              end then {
                s.current_candidate := s.current_delegated;
                s.current_delegated := Some(args.candidate);
                operations := set_delegate(s.current_delegated) # operations;
              } else s.current_candidate := Some(args.candidate);
            else skip;
          }
        end
      }
      | Veto(n) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* Vote for veto the current delegated baker by freezing shares *)
function veto (const p : dex_action; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(token_amount) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(args) -> {
        case s.ledger[args.voter] of 
          | None -> failwith ("Dex/no-shares")
          | Some(account) -> {
            const share : nat = account.balance;

            const voter_info : vote_info = get_voter(args.voter, s);
            if account.balance + voter_info.veto < args.value then
              failwith("Dex/not-enough-balance")
            else skip;
            if args.voter =/= Tezos.sender then block {
              const spender_allowance : nat = get_allowance(account, Tezos.sender, s);
              if spender_allowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spender_allowance - args.value);
            } else skip;

            account.balance := abs(account.balance + voter_info.veto - args.value);
            account.frozen_balance := abs(account.frozen_balance - voter_info.veto + args.value);
            s.ledger[args.voter] := account;

            if s.last_veto > voter_info.last_veto then 
              voter_info.veto := 0n
            else skip;
            
            s.veto := abs(s.veto + args.value - voter_info.veto);
            voter_info.veto := args.value;
            voter_info.last_veto := Tezos.now;
            s.voters[args.voter] := voter_info;

            if s.veto > s.total_votes / 3n then {
                s.veto := 0n;
                s.last_veto := Tezos.now;
                case s.current_delegated of None -> skip
                | Some(d) -> {
                  s.vetos[d] := Tezos.now + veto_period;
                  case s.current_candidate of None -> 
                    s.current_delegated := s.current_candidate
                  | Some(c) -> {
                    s.current_delegated := if d = c then
                      (None: option(key_hash));
                    else s.current_candidate;
                    s.current_candidate := (None: option(key_hash));
                  }
                  end;
                  operations := set_delegate(s.current_delegated) # operations;
                }
                end;
            } else skip;
          }
        end
      }
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* Exchange Tez to tokens *)
function tez_to_token (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(args) -> {
        if Tezos.amount / 1mutez > 0n and args.amount > 0n then block {
          s.tez_pool := s.tez_pool + Tezos.amount / 1mutez;
          const new_token_pool : nat = s.invariant / abs(s.tez_pool - Tezos.amount / 1mutez / fee_rate);
          const tokens_out : nat = abs(s.token_pool - new_token_pool);
            if tokens_out >= args.amount then {
              s.token_pool := new_token_pool;
              s.invariant := s.tez_pool * new_token_pool;
              operations := transaction(
                TransferType(this, (args.receiver, tokens_out)), 
                0mutez, 
                get_token_contract(s.token_address)
              ) # operations;
          } else failwith("Dex/high-min-out");
        } else failwith("Dex/wrong-params")
      }
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* Exchange tokens to tez, note: tokens should be approved before the operation *)
function token_to_tez (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(args) -> {
        if args.amount > 0n and args.min_out > 0n then {
          s.token_pool := s.token_pool + args.amount;
          const new_tez_pool : nat = s.invariant / abs(s.token_pool - args.amount / fee_rate);
          const tez_out : nat = abs(s.tez_pool - new_tez_pool);
          if tez_out >= args.min_out then {
            s.tez_pool := new_tez_pool;
            s.invariant := new_tez_pool * s.token_pool;
          } else failwith("Dex/high-min-tez-out");
        } else failwith("Dex/wrong-params");
        operations := list [transaction(
            TransferType(Tezos.sender, (this, args.amount)), 
            0mutez, 
            get_token_contract(s.token_address)); 
          transaction(
            unit, 
            args.min_out * 1mutez, 
            (get_contract(args.receiver) : contract(unit)));
        ];
      }
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* Provide liquidity (both tokens and tez) to the pool, note: tokens should be approved before the operation *)
function invest_liquidity (const p : dex_action; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(min_shares) -> {
        const shares_purchased : nat = (Tezos.amount / 1mutez) * s.total_supply / s.tez_pool; 
        if min_shares > 0n and shares_purchased >= min_shares then 
          skip 
        else failwith("Dex/wrong-params");
        s := update_reward(s);

        const tokens_required : nat = shares_purchased * s.token_pool / s.total_supply;
        if tokens_required = 0n then failwith("Dex/dangerous-rate") else {
          var account : account_info := get_account(Tezos.sender, s);
          const share : nat = account.balance;

          s := update_user_reward(Tezos.sender, account, share + shares_purchased + account.frozen_balance, s);

          account.balance := share + shares_purchased;
          s.ledger[Tezos.sender] := account;
          s.tez_pool := s.tez_pool + Tezos.amount / 1mutez;
          s.token_pool := s.token_pool + tokens_required;
          s.invariant := s.tez_pool * s.token_pool;
          s.total_supply := s.total_supply + shares_purchased;
        };
        operations := list[transaction(TransferType(Tezos.sender, (this, tokens_required)), 
          0mutez, 
          get_token_contract(s.token_address)
        )];
      }
      | DivestLiquidity(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* Remove liquidity (both tokens and tez) from the pool by burning shares *)
function divest_liquidity (const p : dex_action; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
      case p of
      | InitializeExchange(token_amount) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(min_shares) -> failwith("00")
      | DivestLiquidity(args) -> {
        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;
        if args.shares > 0n and args.shares <= share then block {
          s := update_reward(s);

          s := update_user_reward(Tezos.sender, account, abs(share - args.shares) + account.frozen_balance,s);

          account.balance := abs(share - args.shares);
          s.ledger[Tezos.sender] := account;

          const tez_divested : nat = s.tez_pool * args.shares / s.total_supply;
          const tokens_divested : nat = s.token_pool * args.shares / s.total_supply;

          s.total_supply := abs(s.total_supply - args.shares);
          s.tez_pool := abs(s.tez_pool - tez_divested);
          s.token_pool := abs(s.token_pool - tokens_divested);
          s.invariant := if s.total_supply = 0n then 0n; else s.tez_pool * s.token_pool;

          operations := list [
            transaction(
              TransferType(this, (Tezos.sender, tokens_divested)), 
              0mutez,          
              get_token_contract(s.token_address)
            ); 
            transaction(
              unit, 
              tez_divested * 1mutez, 
              (get_contract(Tezos.sender) : contract(unit)));
          ];
        } else failwith("Dex/wrong-params");
      }
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

(* View function that forwards the allowance amt of spender in the name of tokenOwner to a contract *)
function get_allowance (const p : token_action; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> {
      const owner_account : account_info = get_account(params.0.0, s);
      const spender_allowance : nat = get_allowance(owner_account, params.0.1, s);
      operations := list [transaction(spender_allowance, 0tz, params.1)];
    }
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with (operations, s)

(* The default method to be called when no entrypoint is chosen *)
function receive_reward (const p : dex_action; const s : dex_storage; const this : address) : return is 
  block {
    s := update_reward(s);
  
    s.reward_info.reward := s.reward_info.reward + Tezos.amount / 1mutez;
  } with ((nil : list(operation)), s)

(* Withdraw reward from baker *)
function withdrawProfit (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(receiver) -> {
        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;

        s := update_reward(s);

        s := update_user_reward(Tezos.sender, account, account.balance + account.frozen_balance, s);

        var user_reward_info : user_reward_info := get_user_reward_info(Tezos.sender, s);
        const reward : nat = user_reward_info.reward;
        user_reward_info.reward := 0n;
        s.user_rewards[Tezos.sender] := user_reward_info;
        
        operations := list [transaction(
          unit, 
          reward / accurancy_multiplier * 1mutez, 
          (get_contract(receiver) : contract(unit)))];
      }
    end
  } with (operations, s)

const create_dex : create_dex_func =
[%Michelson ( {| { UNPPAIIR ;
                  CREATE_CONTRACT 
#include "Dex.tz"
                  ;
                    PAIR } |}
           : create_dex_func)];
  
(* Create the pool contract for Tez-Token pair *)
function launch_exchange (const self : address; const token : address; const token_amount : nat; var s : exchange_storage) :  full_factory_return is
  block {
    if s.token_list contains token then 
      failwith("Factory/exchange-launched") 
    else skip;
    if Tezos.amount < 1mutez or token_amount < 1n then 
      failwith("Dex/not-allowed") 
    else skip; 
    s.token_list := Set.add (token, s.token_list);

    const res : (operation * address) = create_dex((None : option(key_hash)), Tezos.amount, record [
      storage = 
        record [
            tez_pool = Tezos.amount / 1mutez;      
            token_pool = token_amount;      
            invariant = Tezos.amount / 1mutez * token_amount;      
            total_supply = 1000n; 
            token_address = token;      
            ledger = big_map[Tezos.sender -> record [
                balance = 1000n;
                frozen_balance = 0n;
                allowances = (map [] : map(address, nat));
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
      dex_lambdas = s.dex_lambdas;
      token_lambdas = s.token_lambdas;
    ]);
    s.token_to_exchange[token] := res.1;
  } with (list[res.0;
    transaction(
      TransferType(Tezos.sender, (res.1, token_amount)), 
      0mutez, 
      get_token_contract(token)
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
