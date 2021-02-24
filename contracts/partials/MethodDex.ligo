
(* Helper function to get account *)
function get_account (const addr : address; const s : dex_storage) : account_info is
  block {
    var acct : account_info :=
      record [
        balance    = 0n;
        frozen_balance   = 0n;
#if FA2_STANDARD_ENABLED
        allowances = (set [] : set (address));
#else
        allowances = (map [] : map(address, nat));
#endif
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

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

(* Helper function to get voter info *)
function get_voter (const addr : address; const s : dex_storage) : vote_info is
  block {
    var acct : vote_info :=
      record [
        candidate    = (None : option(key_hash));
        vote         = 0n;
        veto         = 0n;
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
        reward         = 0n;
        reward_paid    = 0n;
      ];
    case s.user_rewards[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct


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

(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange (const p : dex_action ; const s : dex_storage ; const this: address) :  return is
  block {
    var operations : list(operation) := list[];
      case p of
        | InitializeExchange(token_amount) -> {
          (* check preconditions *)
          if s.invariant =/= 0n (* no reserves *)
            or s.total_supply =/= 0n  (* no shares owned *)
            or Tezos.amount < 1mutez (* XTZ provided *)
            or token_amount < 1n (* tokens provided *)
          then 
            failwith("Dex/not-allowed")
          else skip; 

          s.token_pool := token_amount;
          s.tez_pool := Tezos.amount / 1mutez;
          s.invariant := s.tez_pool * s.token_pool;
          s.ledger[Tezos.sender] := record [
              balance    = Tezos.amount / 1mutez;
              frozen_balance    = 0n;
#if FA2_STANDARD_ENABLED
              allowances = (set [] : set(address));
#else
              allowances = (map [] : map(address, nat));
#endif
            ];
          s.total_supply := Tezos.amount / 1mutez; 

          (* update rewards info *)
          s.reward := 0n;
          s.reward_per_share := 0n;
          s.last_update_time := Tezos.now;
          s.period_finish := Tezos.now;
          s.reward_per_sec := 0n;
          s.total_reward := 0n;

          (* prepare operations to get initial liquidity *)
          operations := list[ transaction(
            wrap_transfer_trx(Tezos.sender, this, token_amount, s), 
            0mutez, 
            get_token_contract(s.token_address)
          )];
        }
        | TezToTokenPayment(n) -> skip
        | TokenToTezPayment(n) -> skip
        | InvestLiquidity(n) -> skip
        | DivestLiquidity(n) -> skip
        | Vote(n) -> skip
        | Veto(n) -> skip
        | WithdrawProfit(n) -> skip
      end
  } with (operations, s)

(* Vote for the baker by freezing shares *)
function vote (const p : dex_action; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(token_amount) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
      | Vote(args) -> {
        case s.ledger[args.voter] of 
          | None -> failwith ("Dex/no-shares")
          | Some(account) -> {
            const share : nat = account.balance;

            (* ensure candidate isn't banned *)
            case s.vetos[args.candidate] of None -> skip
              | Some(c) -> if c > Tezos.now then 
                  failwith ("Dex/veto-candidate") 
                else 
                  remove args.candidate from map s.vetos
            end; 

            const voter_info : vote_info = get_voter(args.voter, s);

            (* ensure there are enough shares to vote *)
            if account.balance + voter_info.vote < args.value then
              failwith("Dex/not-enough-balance")
            else skip;
 
             (* ensure permissions to vote on behalf the voter *)
#if FA2_STANDARD_ENABLED
            if args.voter = Tezos.sender or account.allowances contains Tezos.sender then 
              skip
            else failwith("Dex/not-enough-allowance");
#else
            if args.voter =/= Tezos.sender then block {
              const spender_allowance : nat = get_allowance(account, Tezos.sender, s);
              if spender_allowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spender_allowance - args.value);
            } else skip;
#endif
            (* remove votes for previous candidate *)
            case voter_info.candidate of 
              | None -> skip
              | Some(candidate) -> 
                case s.votes[candidate] of 
                  | None -> failwith("Dex/no-votes") 
                  | Some(v) -> 
                    s.votes[candidate] := abs(v - voter_info.vote)
                end
            end;

            (* update liquid/frozen user's balances *)
            account.balance := abs(account.balance + voter_info.vote - args.value);
            account.frozen_balance := abs(account.frozen_balance - voter_info.vote + args.value);
            s.ledger[args.voter] := account;

            (* update total votes *)
            s.total_votes := abs(s.total_votes + args.value - voter_info.vote);

            (* update user's candidate *)
            if args.value = 0n then voter_info.candidate := (None : option(key_hash))
            else voter_info.candidate := Some(args.candidate);

            (* update user's votes *)
            voter_info.vote := args.value;
            s.voters[args.voter] := voter_info;

            (* ensure the candidate is registered baker *)
            if case s.current_delegated of
              | None -> False 
              | Some(delegate) -> args.candidate = delegate
              end 
            then skip 
            else {
              operations := list [set_delegate(Some(args.candidate)); set_delegate(s.current_delegated)];
            };

            (* update candidates votes *)
            const new_votes: nat = (case s.votes[args.candidate] of  None -> 0n | Some(v) -> v end) + args.value;
            s.votes[args.candidate] := new_votes;

            (* check if current best candidate and delegated should be updated *)
            if args.value =/= 0n and (case s.current_candidate of None -> case s.current_delegated of
                  | None -> True
                  | Some(current) -> current =/= args.candidate
                end
              | Some(candidate) -> (case s.votes[candidate] of None -> 0n | Some(v) -> v end) < new_votes or candidate = args.candidate
              end) then if case s.current_delegated of
                | None -> True
                | Some(current) -> (case s.votes[current] of None -> 0n | Some(v) -> v end) < new_votes
              end then {
                (* update both candidate and delegate records *)
                s.current_candidate := s.current_delegated;
                s.current_delegated := Some(args.candidate);

                (* prepare operation to change the delegated *)
                operations := list [set_delegate(s.current_delegated)];
              } else s.current_candidate := Some(args.candidate); (* update current candidate *)
            else skip;
          }
        end
      }
      | Veto(n) -> skip
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* Vote for veto the current delegated baker by freezing shares *)
function veto (const p : dex_action; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(token_amount) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
      | Vote(n) -> skip
      | Veto(args) -> {
        case s.ledger[args.voter] of 
          | None -> failwith ("Dex/no-shares")
          | Some(account) -> {
            const share : nat = account.balance;

            const voter_info : vote_info = get_voter(args.voter, s);

            (* ensure there are enough shares to vote *)
            if account.balance + voter_info.veto < args.value then
              failwith("Dex/not-enough-balance")
            else skip;

            (* ensure permissions to act in behalf of account *)
#if FA2_STANDARD_ENABLED
            if args.voter = Tezos.sender or account.allowances contains Tezos.sender then 
              skip
            else failwith("Dex/not-enough-allowance");
#else
            if args.voter =/= Tezos.sender then block {
              const spender_allowance : nat = get_allowance(account, Tezos.sender, s);
              if spender_allowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spender_allowance - args.value);
            } else skip;
#endif

            (* update liquid/frozen balance *)
            account.balance := abs(account.balance + voter_info.veto - args.value);
            account.frozen_balance := abs(account.frozen_balance - voter_info.veto + args.value);
            s.ledger[args.voter] := account;

            (* remove last if the delegate has changed since last user's veto *)
            if s.last_veto >= voter_info.last_veto then 
              voter_info.veto := 0n
            else skip;
            
            (* update total veto *)
            s.veto := abs(s.veto + args.value - voter_info.veto);

            (* update user's vetos *)
            voter_info.veto := args.value;
            voter_info.last_veto := Tezos.now;
            s.voters[args.voter] := voter_info;

            (* check if ban should be applied *)
            if s.veto > s.total_votes / 3n then {
              (* reset veto counter *)
              s.veto := 0n;

              (* update time of the last veto *)
              s.last_veto := Tezos.now;
              
              (* update current delegated and candidate *)
              case s.current_delegated of None -> skip
              | Some(d) -> {
                s.vetos[d] := Tezos.now + veto_period;
                case s.current_candidate of None -> 
                  s.current_delegated := s.current_candidate
                | Some(c) -> {
                  s.current_delegated := if d = c then (None: option(key_hash))
                    else s.current_candidate;
                  s.current_candidate := (None: option(key_hash));
                }
                end;
              }
              end;

              (* prepare delegate operation *)
              operations := set_delegate(s.current_delegated) # operations;
            } else skip;
          }
        end
      }
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* Exchange Tez to tokens *)
function tez_to_token (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TezToTokenPayment(args) -> {
        (* ensure *)
        if Tezos.amount / 1mutez > 0n (* XTZ sent *)
        and args.amount > 0n (* minimal amount is non-zero *)
        then block {
          (* update XTZ reserves *)
          s.tez_pool := s.tez_pool + Tezos.amount / 1mutez;
          
          (* calculate new token reserves *)
          const new_token_pool : nat = s.invariant / abs(s.tez_pool - Tezos.amount / 1mutez / fee_rate);
          
          (* calculate swapped token amount *)
          const tokens_out : nat = abs(s.token_pool - new_token_pool);

          (* ensure requirements *)
          if tokens_out >= args.amount (* sutisfy minimal requested amount *)
          and tokens_out <= s.token_pool / 3n (* not cause a high price impact *)
          then {
            (* update token reserves *)
            s.token_pool := new_token_pool;

            (* update inariant *)
            s.invariant := s.tez_pool * new_token_pool;

            (* prepare the transfer operation *)
            operations := transaction(
              wrap_transfer_trx(this, args.receiver, tokens_out, s), 
              0mutez, 
              get_token_contract(s.token_address)
            ) # operations;
          } else failwith("Dex/wrong-out");
        } else failwith("Dex/wrong-params")
      }
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
      | Vote(n) -> skip
      | Veto(voter) -> skip
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* Exchange tokens to tez, note: tokens should be approved before the operation *)
function token_to_tez (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(args) -> {
        if args.amount > 0n (* non-zero amount of tokens exchanged *)
        and args.min_out > 0n (* minimal amount out is non-zero *)
        then {
          (* update token reserves *)
          s.token_pool := s.token_pool + args.amount;

          (* calculate new XTZ reserves *)
          const new_tez_pool : nat = s.invariant / abs(s.token_pool - args.amount / fee_rate);
          
          (* calculate amount out *)
          const tez_out : nat = abs(s.tez_pool - new_tez_pool);
          
          (* ensure requirements *)
          if tez_out >= args.min_out (* minimal XTZ amount out is sutisfied *)
          and tez_out <= s.tez_pool / 3n (* the price impact isn't to high *)
          then {
            (* update XTZ pool *)
            s.tez_pool := new_tez_pool;
            (* update exchange invariant *)
            s.invariant := new_tez_pool * s.token_pool;
          } else failwith("Dex/wrong-out");

          (* prepare operations to withdraw user's tokens and transfer XTZ *)
          operations := list [transaction(
              wrap_transfer_trx(Tezos.sender, this, args.amount, s), 
              0mutez, 
              get_token_contract(s.token_address)); 
            transaction(
              unit, 
              tez_out * 1mutez, 
              (get_contract(args.receiver) : contract(unit)));
          ];
        } else failwith("Dex/wrong-params");
      }
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
      | Vote(n) -> skip
      | Veto(voter) -> skip
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* Provide liquidity (both tokens and tez) to the pool, note: tokens should be approved before the operation *)
function invest_liquidity (const p : dex_action; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(max_tokens) -> {
        (* ensure there is liquidity *)
        if s.invariant > 0n then 
          skip 
        else failwith("Dex/not-launched");

        const shares_via_tez : nat = Tezos.amount / 1mutez * s.total_supply / s.tez_pool;
        const shares_purchased : nat = max_tokens * s.total_supply / s.token_pool;

        if shares_via_tez < shares_purchased then
          shares_purchased := shares_via_tez;
        else skip;
 
        (* ensure *)
        if shares_purchased > 0n (* purchsed shares satisfy required minimum *)
        then skip 
        else failwith("Dex/wrong-params");

        (* update loyalty and rewards globaly *)
        s := update_reward(s);

        (* calculate tokens to be withdrawn *)
        const tokens_required : nat = shares_purchased * s.token_pool / s.total_supply;
        const tez_required : nat = shares_purchased * s.tez_pool / s.total_supply;
        
        (* ensure *)
        if tokens_required = 0n (* providing liquidity won't impact on price *)
        or tez_required = 0n (* providing liquidity won't impact on price *)
        or tokens_required > max_tokens (* required tokens doesn't exceed max allowed by user *)
        or tez_required > Tezos.amount / 1mutez (* required tez doesn't exceed max allowed by user *)
        then 
          failwith("Dex/dangerous-rate") 
        else {
          var account : account_info := get_account(Tezos.sender, s);
          const share : nat = account.balance;

          (* update user's loyalty and shares *)
          s := update_user_reward(Tezos.sender, account, share + shares_purchased + account.frozen_balance, s);

          (* update user rewards *)
          if tez_required < Tezos.amount / 1mutez then {
            var user_reward_info : user_reward_info := get_user_reward_info(Tezos.sender, s);
            user_reward_info.reward := user_reward_info.reward + abs(Tezos.amount / 1mutez - tez_required) * accurancy_multiplier;
            s.user_rewards[Tezos.sender] := user_reward_info;
          } else skip;

          (* update user's shares *)
          account.balance := share + shares_purchased;
          s.ledger[Tezos.sender] := account;

          (* update reserves *)
          s.tez_pool := s.tez_pool + tez_required;
          s.token_pool := s.token_pool + tokens_required;
          
          (* update invarianе *)
          s.invariant := s.tez_pool * s.token_pool;

          (* update total number of shares *)
          s.total_supply := s.total_supply + shares_purchased;
        };
        operations := list[transaction(wrap_transfer_trx(Tezos.sender, this, tokens_required, s), 
          0mutez, 
          get_token_contract(s.token_address)
        )];
      }
      | DivestLiquidity(n) -> skip
      | Vote(n) -> skip
      | Veto(voter) -> skip
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens and tez) from the pool by burning shares *)
function divest_liquidity (const p : dex_action; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
      case p of
      | InitializeExchange(token_amount) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(min_shares) -> skip
      | DivestLiquidity(args) -> {
        (* ensure there is liquidity *)
        if s.invariant > 0n then 
          skip 
        else failwith("Dex/not-launched");
        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;
        (* ensure *)
        if args.shares > 0n (* minimal burn's shares are non-zero *)
        and args.shares <= share (* burnt shares are lower than liquid balance *)
        then block {
          (* update loyalty and rewards globaly *)
          s := update_reward(s);

          (* update user's loyalty and shares *)
          s := update_user_reward(Tezos.sender, account, abs(share - args.shares) + account.frozen_balance,s);

          (* update users shares *)
          account.balance := abs(share - args.shares);
          s.ledger[Tezos.sender] := account;

          (* calculate amount of token's sent to user *)
          const tez_divested : nat = s.tez_pool * args.shares / s.total_supply;
          const tokens_divested : nat = s.token_pool * args.shares / s.total_supply;

          (* ensure minimal amounts out are non-zero *)
          if args.min_tez > 0n and args.min_tokens > 0n then 
            skip 
          else failwith("Dex/dust-output");

          (* ensure minimal amounts are satisfied *)
          if tez_divested >= args.min_tez and tokens_divested >= args.min_tokens then 
            skip 
          else failwith("Dex/high-expectation");

          (* update total shares *)
          s.total_supply := abs(s.total_supply - args.shares);
          
          (* update reserves *)
          s.tez_pool := abs(s.tez_pool - tez_divested);
          s.token_pool := abs(s.token_pool - tokens_divested);

          (* update invariant *)
          s.invariant := if s.total_supply = 0n then 0n; else s.tez_pool * s.token_pool;

          (* prepare operations with XTZ and tokens to user *)
          operations := list [
            transaction(
              wrap_transfer_trx(this, Tezos.sender, tokens_divested, s), 
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
      | Vote(n) -> skip
      | Veto(voter) -> skip
      | WithdrawProfit(n) -> skip
    end
  } with (operations, s)

(* The default method to be called when no entrypoint is chosen *)
function receive_reward (const p : dex_action; const s : dex_storage; const this : address) : return is 
  block {
    (* update loyalty and rewards globaly *)
    s := update_reward(s);
  
    (* update collected rewards amount *)
    s.reward := s.reward + Tezos.amount / 1mutez;
    s.tez_pool := abs(Tezos.balance / 1mutez + s.reward_paid - s.reward - s.total_reward);
  } with ((nil : list(operation)), s)

(* Withdraw reward from baker *)
function withdraw_profit (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TezToTokenPayment(n) -> skip
      | TokenToTezPayment(n) -> skip
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
      | Vote(n) -> skip
      | Veto(voter) -> skip
      | WithdrawProfit(receiver) -> {
        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;
  
        (* update loyalty and rewards globaly *)
        s := update_reward(s);

        (* update user's loyalty and shares *)
        s := update_user_reward(Tezos.sender, account, account.balance + account.frozen_balance, s);

        var user_reward_info : user_reward_info := get_user_reward_info(Tezos.sender, s);
        const reward : nat = user_reward_info.reward;
        
        (* reset user's reward *)
        user_reward_info.reward := 0n;
        s.user_rewards[Tezos.sender] := user_reward_info;

        (* update total paid rewards *)
        s.reward_paid := s.reward_paid + reward / accurancy_multiplier;
        
        (* prepare transfer operations if there are tokens to sent *)
        if reward >= accurancy_multiplier then {
          operations := list [transaction(
            unit, 
            reward / accurancy_multiplier * 1mutez, 
            (get_contract(receiver) : contract(unit)))];
        } else skip;
      }
    end
  } with (operations, s)