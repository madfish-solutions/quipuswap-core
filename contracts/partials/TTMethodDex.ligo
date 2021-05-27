(* Helper function to get account *)
function get_account (const key : (address * nat); const s : dex_storage) : account_info is
  case s.ledger[key] of
    None -> record [
      balance    = 0n;
      allowances = (set [] : set (address));
    ]
  | Some(instance) -> instance
  end;

(* Helper function to get account *)
function get_pair (const key : tokens_info; const s : dex_storage) : (pair_info * nat) is
  block {
    const token_bytes : token_pair = Bytes.pack(key);
    const token_id : nat = case s.token_to_id[token_bytes] of
        None -> s.pairs_count
      | Some(instance) -> instance
      end;
    const pair : pair_info = case s.pairs[token_id] of
        None -> record [
          token_a_pool    = 0n;
          token_b_pool    = 0n;
          total_supply    = 0n;
        ]
      | Some(instance) -> instance
      end;
  } with (pair, token_id)

(* Helper function to prepare the token transfer *)
#if FA2_STANDARD_ENABLED
function wrap_transfer_trx(const owner : address; const receiver : address; const value : nat; const token_id : nat) : transfer_type is
  TransferType(list[
    record[
      from_ = owner;
      txs = list [ record [
          to_ = receiver;
          token_id = token_id;
          amount = value;
        ] ]
    ]
  ])
#else
function wrap_transfer_trx(const owner : address; const receiver : address; const value : nat) : transfer_type is
  TransferType(owner, (receiver, value))
#endif

(* Helper function to get token contract *)
function get_token_contract(const token_address : address) : contract(transfer_type) is
  case (Tezos.get_entrypoint_opt("%transfer", token_address) : option(contract(transfer_type))) of
    Some(contr) -> contr
    | None -> (failwith("Dex/not-token") : contract(transfer_type))
  end;

#include "../partials/TTMethodFA2.ligo"

(* Initialize exchange after the previous liquidity was drained *)
function initialize_exchange (const p : dex_action ; const s : dex_storage ; const this: address) :  return is
  block {
    var operations : list(operation) := list[];
      case p of
        | InitializeExchange(params) -> {
          (* check preconditions *)
          if params.pair.token_a_address > params.pair.token_b_address then
            failwith("Dex/wrong-pair")
          else skip;

          (* get par info*)
          const res : (pair_info * nat) = get_pair(params.pair, s);
          const pair : pair_info = res.0;
          const token_id : nat = res.1;

          (* update counter if needed *)
          if s.pairs_count = token_id then {
            s.token_to_id[Bytes.pack(params.pair)] := token_id;
            s.pairs_count := s.pairs_count + 1n;
          } else skip;

          (* check preconditions *)
          if pair.token_a_pool * pair.token_b_pool =/= 0n (* no reserves *)
          then failwith("Dex/non-zero-reserves") else skip;
          if pair.total_supply =/= 0n  (* no shares owned *)
          then failwith("Dex/non-zero-shares") else skip;
          if params.token_a_in < 1n (* XTZ provided *)
          then failwith("Dex/no-token-a") else skip;
          if params.token_b_in < 1n (* XTZ provided *)
          then failwith("Dex/no-token-b") else skip;

          (* update pool reserves *)
          pair.token_a_pool := params.token_a_in;
          pair.token_b_pool := params.token_b_in;

          (* calculate initial shares *)
          const init_shares : nat =
            if params.token_a_in < params.token_b_in then
              params.token_a_in
            else params.token_b_in;

          (* distribute initial shares *)
          s.ledger[(Tezos.sender, token_id)] := record [
              balance    = init_shares;
              allowances = (set [] : set(address));
            ];
          pair.total_supply := init_shares;

          (* update storage *)
          s.pairs[token_id] := pair;
          s.tokens[token_id] := params.pair;

          (* prepare operations to get initial liquidity *)
          operations := list[
            Tezos.transaction(
              wrap_transfer_trx(Tezos.sender,
                this,
                params.token_a_in
#if FA2_STANDARD_ENABLED
                , params.pair.token_a_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_a_address)
            );
            Tezos.transaction(
              wrap_transfer_trx(Tezos.sender,
                this,
                params.token_b_in
#if FA2_STANDARD_ENABLED
                , params.pair.token_b_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_b_address)
            )];
        }
        | TokenToTokenPayment(n) -> skip
        | InvestLiquidity(n) -> skip
        | DivestLiquidity(n) -> skip

      end
  } with (operations, s)

(* Exchange tokens to tez, note: tokens should be approved before the operation *)
function token_to_token (const p : dex_action; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TokenToTokenPayment(params) -> {
        (* check preconditions *)
        if params.pair.token_a_address > params.pair.token_b_address then
          failwith("Dex/wrong-pair")
        else skip;

        (* get par info*)
        const res : (pair_info * nat) = get_pair(params.pair, s);
        const pair : pair_info = res.0;
        const token_id : nat = res.1;

        (* ensure there is liquidity *)
        if pair.token_a_pool * pair.token_b_pool > 0n then
          skip
        else failwith("Dex/not-launched");

        if params.amount_in > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-amount-in");

        if params.min_amount_out > 0n (* non-zero amount of tokens exchanged *)
        then skip
        else failwith ("Dex/zero-min-amount-out");

        case params.operation of
        | Sell -> {
          (* calculate amount out *)
          const token_a_in_with_fee : nat = params.amount_in * 997n;
          const numerator : nat = token_a_in_with_fee * pair.token_b_pool;
          const denominator : nat = pair.token_a_pool * 1000n + token_a_in_with_fee;

          (* calculate swapped token amount *)
          const token_b_out : nat = numerator / denominator;

          (* ensure requirements *)
          if token_b_out >= params.min_amount_out (* minimal XTZ amount out is sutisfied *)
          then skip else failwith("Dex/wrong-min-out");

          (* ensure requirements *)
          if token_b_out <= pair.token_b_pool / 3n (* the price impact isn't to high *)
          then {
            (* update XTZ pool *)
            pair.token_b_pool := abs(pair.token_b_pool - token_b_out);
            pair.token_a_pool := pair.token_a_pool + params.amount_in;
          } else failwith("Dex/wrong-out");

          (* prepare operations to withdraw user's tokens and transfer XTZ *)

          operations := list[
            Tezos.transaction(
              wrap_transfer_trx(Tezos.sender,
                this,
                params.amount_in
#if FA2_STANDARD_ENABLED
                , params.pair.token_a_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_a_address)
            );
            Tezos.transaction(
              wrap_transfer_trx(this,
                params.receiver,
                token_b_out
#if FA2_STANDARD_ENABLED
                , params.pair.token_b_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_b_address)
            )];
        }
        | Buy -> {
          (* calculate amount out *)
          const token_b_in_with_fee : nat = params.amount_in * 997n;
          const numerator : nat = token_b_in_with_fee * pair.token_a_pool;
          const denominator : nat = pair.token_b_pool * 1000n + token_b_in_with_fee;

          (* calculate swapped token amount *)
          const token_a_out : nat = numerator / denominator;

          (* ensure requirements *)
          if token_a_out >= params.min_amount_out (* minimal XTZ amount out is sutisfied *)
          then skip else failwith("Dex/wrong-min-out");

          (* ensure requirements *)
          if token_a_out <= pair.token_a_pool / 3n (* the price impact isn't to high *)
          then {
            (* update XTZ pool *)
            pair.token_a_pool := abs(pair.token_a_pool - token_a_out);
            pair.token_b_pool := pair.token_b_pool + params.amount_in;
          } else failwith("Dex/wrong-out");

          (* prepare operations to withdraw user's tokens and transfer XTZ *)
          operations := list[
            Tezos.transaction(
              wrap_transfer_trx(Tezos.sender,
                this,
                params.amount_in
#if FA2_STANDARD_ENABLED
                , params.pair.token_b_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_b_address)
            );
            Tezos.transaction(
              wrap_transfer_trx(this,
                params.receiver,
                token_a_out
#if FA2_STANDARD_ENABLED
                , params.pair.token_a_id
#endif
                ),
              0mutez,
              get_token_contract(params.pair.token_a_address)
            )];
        }
        end;
        s.pairs[token_id] := pair;
      }
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(n) -> skip
    end
  } with (operations, s)

(* Provide liquidity (both tokens and tez) to the pool, note: tokens should be approved before the operation *)
function invest_liquidity (const p : dex_action; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> skip
      | TokenToTokenPayment(n) -> skip
      | InvestLiquidity(params) -> {

        (* check preconditions *)
        if params.pair.token_a_address > params.pair.token_b_address then
          failwith("Dex/wrong-pair")
        else skip;

        (* get par info*)
        const res : (pair_info * nat) = get_pair(params.pair, s);
        const pair : pair_info = res.0;
        const token_id : nat = res.1;

        (* ensure there is liquidity *)
        if pair.token_a_pool * pair.token_b_pool > 0n then
          skip
        else failwith("Dex/not-launched");

        const shares_a_purchased : nat = params.token_a_in * pair.total_supply / pair.token_a_pool;
        const shares_b_purchased : nat = params.token_b_in * pair.total_supply / pair.token_b_pool;
        const shares_purchased : nat = if shares_a_purchased < shares_b_purchased
          then
            shares_a_purchased
          else
            shares_b_purchased;

        (* ensure *)
        if shares_purchased > 0n (* purchsed shares satisfy required minimum *)
        then skip
        else failwith("Dex/wrong-params");

        (* calculate tokens to be withdrawn *)
        const tokens_a_required : nat = shares_purchased * pair.token_a_pool / pair.total_supply;
        if shares_purchased * pair.token_a_pool > tokens_a_required * pair.total_supply then
          tokens_a_required := tokens_a_required + 1n
        else skip;
        const tokens_b_required : nat = shares_purchased * pair.token_b_pool / pair.total_supply;
        if shares_purchased * pair.token_b_pool > tokens_b_required * pair.total_supply then
          tokens_b_required := tokens_b_required + 1n
        else skip;

        (* ensure *)
        if tokens_a_required = 0n  (* providing liquidity won't impact on price *)
        then failwith("Dex/zero-token-a-in") else skip;
        if tokens_b_required = 0n (* providing liquidity won't impact on price *)
        then failwith("Dex/zero-token-b-in") else skip;
        if tokens_a_required > params.token_a_in (* required tokens doesn't exceed max allowed by user *)
        then failwith("Dex/low-max-token-a-in") else skip;
        if tokens_b_required > params.token_b_in (* required tez doesn't exceed max allowed by user *)
        then failwith("Dex/low-max-token-b-in") else skip;

        var account : account_info := get_account((Tezos.sender, token_id), s);
        const share : nat = account.balance;

        (* update user's shares *)
        account.balance := share + shares_purchased;
        s.ledger[(Tezos.sender, token_id)] := account;

        (* update reserves *)
        pair.token_a_pool := pair.token_a_pool + tokens_a_required;
        pair.token_b_pool := pair.token_b_pool + tokens_b_required;

        (* update total number of shares *)
        pair.total_supply := pair.total_supply + shares_purchased;
        s.pairs[token_id] := pair;

        (* prepare operations to get initial liquidity *)
        operations := list[
          Tezos.transaction(
            wrap_transfer_trx(Tezos.sender,
              this,
              tokens_a_required
#if FA2_STANDARD_ENABLED
              , params.pair.token_a_id
#endif
              ),
            0mutez,
            get_token_contract(params.pair.token_a_address)
          );
          Tezos.transaction(
            wrap_transfer_trx(Tezos.sender,
              this,
              tokens_b_required
#if FA2_STANDARD_ENABLED
              , params.pair.token_b_id
#endif
              ),
            0mutez,
            get_token_contract(params.pair.token_b_address)
          )];
      }
      | DivestLiquidity(n) -> skip
    end
  } with (operations, s)

(* Remove liquidity (both tokens and tez) from the pool by burning shares *)
function divest_liquidity (const p : dex_action; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
      case p of
      | InitializeExchange(token_amount) -> skip
      | TokenToTokenPayment(n) -> skip
      | InvestLiquidity(n) -> skip
      | DivestLiquidity(params) -> {
        (* check preconditions *)
        if params.pair.token_a_address > params.pair.token_b_address  then
          failwith("Dex/wrong-pair")
        else skip;

        (* get par info*)
        const res : (pair_info * nat) = get_pair(params.pair, s);
        const pair : pair_info = res.0;
        const token_id : nat = res.1;

        (* ensure pair exist *)
        if s.pairs_count = token_id then
          failwith("Dex/pair-not-exist")
        else skip;

        (* check preconditions *)
        if pair.token_a_pool * pair.token_b_pool > 0n then
          skip
        else failwith("Dex/not-launched");

        var account : account_info := get_account((Tezos.sender, token_id), s);
        const share : nat = account.balance;

        (* ensure *)
        if params.shares > 0n (* minimal burn's shares are non-zero *)
        then skip
        else failwith("Dex/zero-burn-shares");
        if params.shares <= share (* burnt shares are lower than liquid balance *)
        then skip
        else failwith("Dex/insufficient-shares");

        (* update users shares *)
        account.balance := abs(share - params.shares);
        s.ledger[(Tezos.sender, token_id)] := account;

        (* calculate amount of token's sent to user *)
        const token_a_divested : nat = pair.token_a_pool * params.shares / pair.total_supply;
        const token_b_divested : nat = pair.token_b_pool * params.shares / pair.total_supply;

        (* ensure minimal amounts out are non-zero *)
        if params.min_token_a_out > 0n and params.min_token_b_out > 0n then
          skip
        else failwith("Dex/dust-output");

        (* ensure minimal amounts are satisfied *)
        if token_a_divested >= params.min_token_a_out and token_b_divested >= params.min_token_b_out then
          skip
        else failwith("Dex/high-expectation");

        (* update total shares *)
        pair.total_supply := abs(pair.total_supply - params.shares);

        (* update reserves *)
        pair.token_a_pool := abs(pair.token_a_pool - token_a_divested);
        pair.token_b_pool := abs(pair.token_b_pool - token_b_divested);

        (* update storage *)
        s.pairs[token_id] := pair;

        (* prepare operations with XTZ and tokens to user *)
        operations := list [
          transaction(
            wrap_transfer_trx(this,
              Tezos.sender,
              token_a_divested
#if FA2_STANDARD_ENABLED
              , params.pair.token_a_id
#endif
              ),
            0mutez,
            get_token_contract(params.pair.token_a_address)
          );
          transaction(
            wrap_transfer_trx(this,
              Tezos.sender,
              token_b_divested
#if FA2_STANDARD_ENABLED
              , params.pair.token_b_id
#endif
              ),
            0mutez,
            get_token_contract(params.pair.token_b_address)
          );
        ];
      }
    end
  } with (operations, s)
