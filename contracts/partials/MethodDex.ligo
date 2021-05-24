(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange (const p : dex_action ; const s : dex_storage ; const this: address) :  return is
  block {
    var operations : list(operation) := list[];
      case p of
        | InitializeExchange(token_amount) -> {
          (* check preconditions *)
          if s.tez_pool * s.token_pool =/= 0n (* no reserves *)
          then failwith("Dex/non-zero-reserves") else skip;
          if s.total_supply =/= 0n  (* no shares owned *)
          then failwith("Dex/non-zero-shares") else skip;
          if Tezos.amount < 1mutez (* XTZ provided *)
          then failwith("Dex/no-xtz") else skip;
          if token_amount < 1n (* tokens provided *)
          then failwith("Dex/no-tokens") else skip;

          s.token_pool := token_amount;
          s.tez_pool := Tezos.amount / 1mutez;
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
            voter_info.candidate := if args.value = 0n then (None : option(key_hash)) else Some(args.candidate);

            (* update user's votes *)
            voter_info.vote := args.value;
            s.voters[args.voter] := voter_info;

            (* update candidates votes *)
            const prev_votes: nat = (case s.votes[args.candidate] of  None -> 0n | Some(v) -> v end);
            const new_votes: nat = prev_votes + args.value;
            s.votes[args.candidate] := new_votes;

            (* ensure the candidate is registered baker *)
            if case s.current_delegated of
              | None -> prev_votes =/= 0n
              | Some(delegate) -> args.candidate = delegate
              end
            then skip
            else {
              operations := list [Tezos.transaction(args.candidate,
                0mutez,
                get_validator_contract(s.baker_validator))];
            };

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
        if Tezos.amount / 1mutez > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-amount-in");

        if args.min_out > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-min-amount-out");

        (* calculate amount out *)
        const tez_in_with_fee : nat = Tezos.amount / 1mutez * 997n;
        const numerator : nat = tez_in_with_fee * s.token_pool;
        const denominator : nat = s.tez_pool * 1000n + tez_in_with_fee;

        (* calculate swapped token amount *)
        const tokens_out : nat = numerator / denominator;

        (* ensure requirements *)
        if tokens_out >= args.min_out (* sutisfy minimal requested amount *)
        then skip else failwith("Dex/wrong-min-out");

        if tokens_out > s.token_pool / 3n (* not cause a high price impact *)
        then failwith("Dex/high-out")
        else skip;

        (* update reserves *)
        s.token_pool := abs(s.token_pool - tokens_out);
        s.tez_pool := s.tez_pool + Tezos.amount / 1mutez;

        (* prepare the transfer operation *)
        operations := Tezos.transaction(
          wrap_transfer_trx(this, args.receiver, tokens_out, s),
          0mutez,
          get_token_contract(s.token_address)
        ) # operations;
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
        (* ensure *)
        if args.amount > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-amount-in");

        if args.min_out > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-min-amount-out");

        (* calculate amount out *)
        const token_in_with_fee : nat = args.amount * 997n;
        const numerator : nat = token_in_with_fee * s.tez_pool;
        const denominator : nat = s.token_pool * 1000n + token_in_with_fee;
        const tez_out : nat = numerator / denominator;

        (* ensure requirements *)
        if tez_out >= args.min_out (* sutisfy minimal requested amount *)
        then skip
        else failwith("Dex/wrong-min-out");
        if tez_out <= s.tez_pool / 3n (* not cause a high price impact *)
        then skip
        else failwith("Dex/high-out");

        (* update reserves *)
        s.token_pool := s.token_pool + args.amount;
        s.tez_pool := abs(s.tez_pool - tez_out);

        (* prepare operations to withdraw user's tokens and transfer XTZ *)
        operations := list [Tezos.transaction(
            wrap_transfer_trx(Tezos.sender, this, args.amount, s),
            0mutez,
            get_token_contract(s.token_address));
          Tezos.transaction(
            unit,
            tez_out * 1mutez,
            (get_contract(args.receiver) : contract(unit)));
        ];
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
        if s.tez_pool * s.token_pool > 0n then
          skip
        else failwith("Dex/not-launched");

        const shares_purchased : nat = Tezos.amount / 1mutez * s.total_supply / s.tez_pool;

        (* ensure *)
        if shares_purchased > 0n (* purchsed shares satisfy required minimum *)
        then skip
        else failwith("Dex/wrong-params");

        (* update loyalty and rewards globaly *)
        s := update_reward(s);

        (* calculate tokens to be withdrawn *)
        var tokens_required : nat := shares_purchased * s.token_pool / s.total_supply;
        if shares_purchased * s.token_pool > tokens_required * s.total_supply then
          tokens_required := tokens_required + 1n
        else skip;

        (* ensure *)
        if tokens_required = 0n (* required tokens doesn't exceed max allowed by user *)
        then failwith("Dex/zero-tokens-in") else skip;
        if tokens_required > max_tokens (* required tez doesn't exceed max allowed by user *)
        then failwith("Dex/low-max-token-in") else skip;

        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;

        (* update user's loyalty and shares *)
        s := update_user_reward(Tezos.sender, account, share + shares_purchased + account.frozen_balance, s);

        (* update user's shares *)
        account.balance := share + shares_purchased;
        s.ledger[Tezos.sender] := account;

        (* update reserves *)
        s.tez_pool := s.tez_pool + Tezos.amount / 1mutez;
        s.token_pool := s.token_pool + tokens_required;

        (* update total number of shares *)
        s.total_supply := s.total_supply + shares_purchased;
        operations := list[Tezos.transaction(
          wrap_transfer_trx(Tezos.sender, this, tokens_required, s),
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
        if s.tez_pool * s.token_pool > 0n then
          skip
        else failwith("Dex/not-launched");
        var account : account_info := get_account(Tezos.sender, s);
        const share : nat = account.balance;

        (* ensure *)
        if args.shares > 0n (* minimal burn's shares are non-zero *)
          then skip
        else failwith("Dex/zero-burn-shares");
        if args.shares <= share (* burnt shares are lower than liquid balance *)
          then skip
        else failwith("Dex/insufficient-shares");

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

        (* prepare operations with XTZ and tokens to user *)
        operations := list [
          Tezos.transaction(
            wrap_transfer_trx(this, Tezos.sender, tokens_divested, s),
            0mutez,
            get_token_contract(s.token_address)
          );
          Tezos.transaction(
            unit,
            tez_divested * 1mutez,
            (get_contract(Tezos.sender) : contract(unit)));
        ];
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
        user_reward_info.reward := abs (reward - reward / accurancy_multiplier * accurancy_multiplier);
        s.user_rewards[Tezos.sender] := user_reward_info;

        (* update total paid rewards *)
        s.reward_paid := s.reward_paid + reward / accurancy_multiplier;

        (* prepare transfer operations if there are tokens to sent *)
        if reward >= accurancy_multiplier then {
          operations := list [Tezos.transaction(
            unit,
            reward / accurancy_multiplier * 1mutez,
            (get_contract(receiver) : contract(unit)))];
        } else skip;
      }
    end
  } with (operations, s)