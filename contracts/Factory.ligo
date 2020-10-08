#include "IFactory.ligo"

// // types for internal transaction calls
type transfer_type is TransferType of michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
// type token_lookup_type is TokenLookupType of (address * address * nat)
// type use_type is UseType of (nat * dexAction) 

// helpers
function getTokenContract(const tokenAddress : address) : contract(transfer_type) is 
    case (Tezos.get_entrypoint_opt("%transfer", tokenAddress) : option(contract(transfer_type))) of 
      Some(contr) -> contr
      | None -> (failwith("01"):contract(transfer_type))
    end;

// token actions
(* Helper function to get account *)
function getAccount (const addr : address; const s : dex_storage) : account_info is
  block {
    var acct : account_info :=
      record [
        balance    = 0n;
        allowances = (map [] : map (address, nat));
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Helper function to get user reward info *)
function getUserRewardInfo (const addr : address; const s : dex_storage) : user_reward_info is
  block {
    var acct : user_reward_info :=
      record [
        reward        = 0n;
        rewardPaid    = 0n;
        loyalty       = 0n;
        loyaltyPaid   = 0n;
      ];
    case s.userRewards[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Helper function to get allowance for an account *)
function getAllowance (const ownerAccount : account_info; const spender : address; const s : dex_storage) : nat is
  case ownerAccount.allowances[spender] of
    Some (nat) -> nat
  | None -> 0n
  end;

(* Transfer token to another account *)
function transfer (const p : tokenAction; const s : dex_storage) : return is
  block {
    case p of
    | ITransfer(params) -> {
      const value : nat = params.1.1;
      if params.0 = params.1.0 then
        failwith("InvalidSelfToSelfTransfer")
      else skip;
      const senderAccount : account_info = getAccount(params.0, s);
      if senderAccount.balance < value then
        failwith("NotEnoughBalance")
      else skip;
      if params.0 =/= Tezos.sender then block {
        const spenderAllowance : nat = getAllowance(senderAccount, Tezos.sender, s);
        if spenderAllowance < value then
          failwith("NotEnoughAllowance")
        else skip;
        senderAccount.allowances[Tezos.sender] := abs(spenderAllowance - value);
      } else skip;
      senderAccount.balance := abs(senderAccount.balance - value);
      s.ledger[params.0] := senderAccount;
      var destAccount : account_info := getAccount(params.1.0, s);
      destAccount.balance := destAccount.balance + value;
      s.ledger[params.1.0] := destAccount;
    }
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with ((nil  : list(operation)), s)

(* Approve an nat to be spent by another address in the name of the sender *)
function approve (const p : tokenAction; const s : dex_storage) : return is
  block {
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> {
      if params.0 = Tezos.sender then
        failwith("InvalidSelfToSelfApproval")
      else skip;
      var senderAccount : account_info := getAccount(Tezos.sender, s);
      const spenderAllowance : nat = getAllowance(senderAccount, params.0, s);
      senderAccount.allowances[params.0] := params.1;
      s.ledger[Tezos.sender] := senderAccount;
    }
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with ((nil  : list(operation)), s)

(* View function that forwards the balance of source to a contract *)
function getBalance (const p : tokenAction; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> {
      const ownerAccount : account_info = getAccount(params.0, s);
      operations := list [transaction(ownerAccount.balance, 0tz, params.1)];
    }
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with (operations, s)

(* View function that forwards the allowance amt of spender in the name of tokenOwner to a contract *)
function getAllowance (const p : tokenAction; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> {
      const ownerAccount : account_info = getAccount(params.0.0, s);
      const spenderAllowance : nat = getAllowance(ownerAccount, params.0.1, s);
      operations := list [transaction(spenderAllowance, 0tz, params.1)];
    }
    | IGetTotalSupply(params) -> failwith("00")
    end
  } with (operations, s)

// (* View function that forwards the totalSupply to a contract *)
function getTotalSupply (const p : tokenAction; const s : dex_storage) : return is
  block {
    var operations : list(operation) := list[];
    case p of
    | ITransfer(params) -> failwith("00")
    | IApprove(params) -> failwith("00")
    | IGetBalance(params) -> failwith("00")
    | IGetAllowance(params) -> failwith("00")
    | IGetTotalSupply(params) -> {
      operations := list [transaction(s.totalSupply, 0tz, params.1)];
    }
    end
  } with (operations, s)

// functions


// function voteBody (const args : voteArgs ; const s : dex_storage; const this: address) :  (dex_storage) is
// block {
//   // << XXX::IMP_FREEZE_FOR_VOTED_TOKENS (to prevent double-voting)
//   case s.ledger[args.voter] of None -> failwith ("Dex/no-shares")
//   | Some(account) -> {
//     const share : nat = account.balance;
//     case s.vetos[args.candidate] of None -> skip
//       | Some(c) -> if c > Tezos.now then failwith ("Dex/veto-candidate") else remove args.candidate from map s.vetos
//     end; 
//     const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(args.candidate); end;
//     case s.voters[args.voter] of None -> skip
//       | Some(v) -> 
//         case v.candidate of None -> voterInfo := v 
//           | Some(c) -> {
//             if s.totalVotes < share then failwith ("Dex/invalid-shares") else {
//               s.totalVotes := abs(s.totalVotes - share);
//               s.votes[c]:= abs(get_force(c, s.votes) - share);
//               voterInfo := v;
//             };
//           } end
//       end;    
//     if Tezos.sender = args.voter or voterInfo.allowances contains Tezos.sender then {
//       voterInfo.candidate := Some(args.candidate);
//       s.voters[args.voter]:= voterInfo;
//       s.totalVotes := s.totalVotes + share;
//       const newVotes: nat = (case s.votes[args.candidate] of  None -> 0n | Some(v) -> v end) + share;
//       s.votes[args.candidate]:= newVotes;
//       if case s.delegated of None -> True 
//         | Some(delegated) ->
//           if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then False else True
//         end
//       then
//       {
//          s.delegated := Some(args.candidate);
//       } else skip ;
//     } else failwith ("Dex/vote-not-permitted");
//   }
//   end
// } with (s) // << XXX::FREEZE_OPERATION

// function vetoBody (const voter : address ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
// block {
//   var operations: list(operation) := list[];
//   // << XXX::IMP_FREEZE_FOR_VOTED_TOKENS (to prevent double-veto)
//   case s.ledger[voter] of None -> failwith ("Dex/no-voter")
//   | Some(account) -> {
//     const share : nat = account.balance;
//     const src : vote_info = case s.voters[voter] of None -> record allowances = (set [] : set(address)); candidate = (None: option(key_hash)); end
//     | Some(src) -> src
//     end;
//     if Tezos.sender = voter or src.allowances contains Tezos.sender then {
//       var newShare: nat := case s.vetoVoters[voter] of None -> share
//         | Some(prev) ->
//           if share > prev then abs(share - prev) else (failwith ("Dex/old-shares") : nat)
//         end;
//       s.veto := s.veto + newShare;
//       if s.veto > s.totalVotes / 2n then {
//           s.veto := 0n;
//           case s.currentDelegated of None -> failwith ("Dex/no-delegated")
//           | Some(c) -> {
//             s.vetos[c] := Tezos.now + vetoPeriod;
//             s.currentDelegated := (None: option(key_hash));
//             operations := set_delegate(s.currentDelegated) # operations;
//             s.vetoVoters := (big_map [] : big_map(address, nat));
//           }
//           end;
//       } else skip ;
//       s.vetoVoters[voter] := share;
//     } else failwith ("Dex/vote-not-permitted"); // << XXX::FREEZE_ACTION
//   }
//   end
// } with (operations, s)

// function divestLiquidityBody (const args : divestLiquidityArgs ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
// block {
//   var operations: list(operation) := list[];
//   var account : account_info := getAccount(Tezos.sender, s);
//   const share : nat = account.balance;
//   if args.shares > 0n and args.shares <= share then {
//     account.balance := abs(share - args.shares);
//     s.ledger[Tezos.sender] := account;

//     s.currentCycle.totalLoyalty := s.currentCycle.totalLoyalty + abs(Tezos.now - s.currentCycle.lastUpdate) * s.totalSupply;
//     s.currentCycle.lastUpdate := Tezos.now;

//     const tezDivested : nat = s.tezPool * args.shares / s.totalSupply;
//     const tokensDivested : nat = s.tokenPool * args.shares / s.totalSupply;

//     if args.minTez > 0n and args.minTokens > 0n and tezDivested >= args.minTez and tokensDivested >= args.minTokens then {
//       var userCycle : user_cycle_info := get_force(Tezos.sender, s.loyaltyCycle);
//       if userCycle.lastCycle =/= s.currentCycle.counter then {
//         case s.cycles[userCycle.lastCycle] of Some(cycle) -> {
//           userCycle.reward := userCycle.reward + cycle.reward * (userCycle.loyalty + share * abs(cycle.nextCycle - userCycle.lastCycleUpdate)) / cycle.totalLoyalty;
//           userCycle.loyalty := 0n;
//           userCycle.lastCycleUpdate := cycle.start;
//         } 
//         | None -> failwith("Dex/no-cycle")
//         end;
//       } else skip ;

//     if s.currentCycle.counter - userCycle.lastCycle > 1 then 
//       case s.cycles[abs(s.currentCycle.counter - 1n)] of 
//         None -> failwith("Dex/no-full-cycle")
//         | Some(lastFullCycle) -> case s.cycles[userCycle.lastCycle] of 
//           None -> failwith("Dex/no-full-cycle")
//           | Some(lastUserCycle) -> userCycle.reward := userCycle.reward + share * abs(lastFullCycle.cycleCoefficient - lastUserCycle.cycleCoefficient)
//           end
//         end
//        else skip ;
//     userCycle.loyalty := userCycle.loyalty + share * abs(Tezos.now-userCycle.lastCycleUpdate);
//     userCycle.lastCycleUpdate := Tezos.now;
//     userCycle.lastCycle := s.currentCycle.counter;
//     s.loyaltyCycle[Tezos.sender] := userCycle;

//     s.totalSupply := abs(s.totalSupply - args.shares); // << XXX::remove
//     s.tezPool := abs(s.tezPool - tezDivested);
//     s.tokenPool := abs(s.tokenPool - tokensDivested);
//     s.invariant := if s.totalSupply = 0n then 0n; else s.tezPool * s.tokenPool;

//     // << XXX::REMOVE_VOTING_UPDATE, user decide if he frezes new tokens 
//     case s.voters[Tezos.sender] of None -> skip
//       | Some(v) -> {
//         case v.candidate of None -> skip | Some(candidate) -> {
//           const prevVotes: nat = get_force(candidate, s.votes);
//           s.votes[candidate]:= abs(prevVotes - args.shares);
//           if prevVotes = args.shares then remove Tezos.sender from map s.voters; else skip ;
//         } end;
//     } end;
//     // << XXX::REMOVE_VETO_UPDATE, user decide if he frezes new tokens 
//     case s.vetoVoters[Tezos.sender] of None -> skip
//       | Some(prevVotes) -> {
//           s.veto := abs(s.veto - args.shares);
//           if prevVotes = args.shares then 
//             remove Tezos.sender from map s.vetoVoters; 
//           else
//             s.vetoVoters[Tezos.sender] := abs(prevVotes - args.shares);
//         } end;
//     operations := list transaction(TransferType(this, (Tezos.sender, tokensDivested)), 
//       0mutez,          
//       getTokenContract(s.tokenAddress)
//     ); 
//     // << XXX::BURN 
//     transaction(unit, tezDivested * 1mutez, (get_contract(Tezos.sender) : contract(unit))); end;
//     } else failwith("Dex/wrong-out");
//   } else failwith("Dex/wrong-params");
// } with (operations, s)

// function setVotesDelegationBody (const args : setVotesDelegationArgs ; const s : dex_storage ; const this: address) :  (dex_storage) is
// block {
//   if Tezos.sender = args.account then skip
//   else block {
//      const src: vote_info = case s.voters[Tezos.sender] of None -> record allowances = (set [] : set(address)); candidate = (None:option(key_hash)) end 
//         | Some(v) -> v 
//         end ;
//      if Set.size(src.allowances) >= 5n and args.isAllowed then failwith("Dex/many-voter-delegates") else {
//         src.allowances := if args.isAllowed then Set.add (args.account, src.allowances) else Set.remove (args.account, src.allowances) ;
//         s.voters[Tezos.sender] := src;
//      };
//   }
// } with (s)

// wrappers
function initializeExchange (const p : dexAction ; const s : dex_storage ; const this: address) :  return is
  block {
    var operations : list(operation) := list[];
      case p of
        | InitializeExchange(tokenAmount) -> {
          if s.invariant =/= 0n 
            or s.totalSupply =/= 0n 
            or Tezos.amount < 1mutez 
            or tokenAmount < 1n then 
            failwith("Dex/not-allowed")
          else skip; 
          s.tokenPool := tokenAmount;
          s.tezPool := Tezos.amount / 1mutez;
          s.invariant := s.tezPool * s.tokenPool;
          s.ledger[Tezos.sender] := record [
              balance    = 1000n;
              allowances = (map [] : map (address, nat));
            ];
          s.totalSupply := 1000n; 

          (* update rewards info *)
          s.rewardInfo.lastUpdateTime := Tezos.now;
          s.rewardInfo.periodFinish := Tezos.now + votingPeriod;

          // (* update user reward info *)
          // var userRewardInfo : user_reward_info := userRewards(Tezos.sender, s);
          // s.userRewards[Tezos.sender] := userRewardInfo;
          
          operations := list[ transaction(
            TransferType(Tezos.sender, (this, tokenAmount)), 
            0mutez, 
            getTokenContract(s.tokenAddress)
          )];
        }
        | TezToTokenPayment(n) -> failwith("00")
        | TokenToTezPayment(n) -> failwith("00")
        | InvestLiquidity(n) -> failwith("00")
        | DivestLiquidity(n) -> failwith("00")
        | SetVotesDelegation(n) -> failwith("00")
        | Vote(n) -> failwith("00")
        | Veto(n) -> failwith("00")
        | WithdrawProfit(n) -> failwith("00")
      end
  } with (operations, s)

// function setVotesDelegation (const p : dexAction ; const s : dex_storage ; const this: address) :  (list(operation) * dex_storage) is
// block {
//   case p of
//   | InitializeExchange(tokenAmount) -> failwith("00")
//   | TezToTokenPayment(n) -> failwith("00")
//   | TokenToTezPayment(n) -> failwith("00")
//   | InvestLiquidity(n) -> failwith("00")
//   | DivestLiquidity(n) -> failwith("00")
//   | SetVotesDelegation(args) -> {
//     s := setVotesDelegationBody(args, s, this);
//   }
//   | Vote(n) -> failwith("00")
//   | Veto(n) -> failwith("00")
//   | WithdrawProfit(n) -> failwith("00")
//   | ITransfer(n) -> failwith("00")
//   | IApprove(n) -> failwith("00")
//   | IGetBalance(n) -> failwith("00")
//   | IGetAllowance(n) -> failwith("00")
//   | IGetTotalSupply(n) -> failwith("00")
//   end
// } with ((nil:list(operation)), s)

// function vote (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
// block {
//   case p of
//   | InitializeExchange(tokenAmount) -> failwith("00")
//   | TezToTokenPayment(n) -> failwith("00")
//   | TokenToTezPayment(n) -> failwith("00")
//   | InvestLiquidity(n) -> failwith("00")
//   | DivestLiquidity(n) -> failwith("00")
//   | SetVotesDelegation(n) -> failwith("00")
//   | Vote(args) -> {
//       s := voteBody(args, s, this);
//     }
//   | Veto(n) -> failwith("00")
//   | WithdrawProfit(n) -> failwith("00")
//   | ITransfer(n) -> failwith("00")
//   | IApprove(n) -> failwith("00")
//   | IGetBalance(n) -> failwith("00")
//   | IGetAllowance(n) -> failwith("00")
//   | IGetTotalSupply(n) -> failwith("00")
//   end
// } with ((nil:list(operation)), s)

// function veto (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
// block {
//   var operations: list(operation) := list[];
//   case p of
//   | InitializeExchange(tokenAmount) -> failwith("00")
//   | TezToTokenPayment(n) -> failwith("00")
//   | TokenToTezPayment(n) -> failwith("00")
//   | InvestLiquidity(n) -> failwith("00")
//   | DivestLiquidity(n) -> failwith("00")
//   | SetVotesDelegation(n) -> failwith("00")
//   | Vote(n) -> failwith("00")
//   | Veto(voter) -> {
//       const res : (list(operation) * dex_storage) = vetoBody(voter, s, this);
//       operations := res.0;
//       s := res.1;
//     }
//   | WithdrawProfit(n) -> failwith("00")
//   | ITransfer(n) -> failwith("00")
//   | IApprove(n) -> failwith("00")
//   | IGetBalance(n) -> failwith("00")
//   | IGetAllowance(n) -> failwith("00")
//   | IGetTotalSupply(n) -> failwith("00")
//   end
// } with (operations, s)

function tezToToken (const p : dexAction; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(args) -> {
        if Tezos.amount / 1mutez > 0n and args.amount > 0n then block {
          s.tezPool := s.tezPool + Tezos.amount / 1mutez;
          const newTokenPool : nat = s.invariant / abs(s.tezPool - Tezos.amount / 1mutez / feeRate);
          const tokensOut : nat = abs(s.tokenPool - newTokenPool);
            if tokensOut >= args.amount then {
              s.tokenPool := newTokenPool;
              s.invariant := s.tezPool * newTokenPool;
              operations := transaction(
                TransferType(this, (args.receiver, tokensOut)), 
                0mutez, 
                getTokenContract(s.tokenAddress)
              ) # operations;
          } else failwith("Dex/high-min-out");
        } else failwith("Dex/wrong-params")
      }
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | SetVotesDelegation(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

function tokenToTez (const p : dexAction; const s : dex_storage; const this : address) : return is
  block {
    var operations : list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(args) -> {
        if args.amount > 0n and args.minOut > 0n then {
          s.tokenPool := s.tokenPool + args.amount;
          const newTezPool : nat = s.invariant / abs(s.tokenPool - args.amount / feeRate);
          const tezOut : nat = abs(s.tezPool - newTezPool);
          if tezOut >= args.minOut then {
            s.tezPool := newTezPool;
            s.invariant := newTezPool * s.tokenPool;
          } else failwith("Dex/high-min-tez-out");
        } else failwith("Dex/wrong-params");
        operations := list [transaction(
            TransferType(Tezos.sender, (this, args.amount)), 
            0mutez, 
            getTokenContract(s.tokenAddress)); 
          transaction(
            unit, 
            args.minOut * 1mutez, 
            (get_contract(args.receiver) : contract(unit)));
        ];
      }
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | SetVotesDelegation(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

function investLiquidity (const p : dexAction; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(minShares) -> {
        const sharesPurchased : nat = (Tezos.amount / 1mutez) * s.totalSupply / s.tezPool; 
        if minShares > 0n and sharesPurchased >= minShares then 
          skip 
        else failwith("Dex/wrong-params");
        (* update rewards info *)
        s.rewardInfo.totalAccomulatedLoyalty := s.rewardInfo.totalAccomulatedLoyalty + abs(Tezos.now - s.rewardInfo.lastUpdateTime) * accurancyMultiplier / s.totalSupply;
        s.rewardInfo.lastUpdateTime := Tezos.now;

        (* check reward update*)
        if Tezos.now > s.rewardInfo.periodFinish then block {
          s.rewardInfo.rewardPerToken := s.rewardInfo.rewardPerToken + s.rewardInfo.reward * accurancyMultiplier * accurancyMultiplier / s.rewardInfo.totalAccomulatedLoyalty;
          s.rewardInfo.periodFinish := Tezos.now + votingPeriod;
        } else skip;

        const tokensRequired : nat = sharesPurchased * s.tokenPool / s.totalSupply;
        if tokensRequired = 0n then failwith("Dex/dangerous-rate") else {
          var account : account_info := getAccount(Tezos.sender, s);
          const share : nat = account.balance;

          (* update user loyalty *)
          var userRewardInfo : user_reward_info := getUserRewardInfo(Tezos.sender, s);
          const currentLoyalty : nat = share * s.rewardInfo.totalAccomulatedLoyalty;
          userRewardInfo.loyalty := userRewardInfo.loyalty + abs(currentLoyalty - userRewardInfo.loyaltyPaid);
          userRewardInfo.loyaltyPaid := currentLoyalty;

          (* update user reward *)
          const currentReward : nat = s.rewardInfo.totalAccomulatedLoyalty * s.rewardInfo.rewardPerToken;
          userRewardInfo.reward := userRewardInfo.loyalty + abs(currentReward - userRewardInfo.rewardPaid);
          userRewardInfo.rewardPaid := currentReward;

          s.userRewards[Tezos.sender] := userRewardInfo;

          account.balance := share + sharesPurchased;
          s.ledger[Tezos.sender] := account;
          s.tezPool := s.tezPool + Tezos.amount / 1mutez;
          s.tokenPool := s.tokenPool + tokensRequired;
          s.invariant := s.tezPool * s.tokenPool;
          s.totalSupply := s.totalSupply + sharesPurchased;
        };
        operations := list[transaction(TransferType(Tezos.sender, (this, tokensRequired)), 
          0mutez, 
          getTokenContract(s.tokenAddress)
        )];
      }
      | DivestLiquidity(n) -> failwith("00")
      | SetVotesDelegation(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

// function divestLiquidity (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
// block {
//   var operations: list(operation) := list[];
//   case p of
//   | InitializeExchange(tokenAmount) -> failwith("00")
//   | TezToTokenPayment(n) -> failwith("00")
//   | TokenToTezPayment(n) -> failwith("00")
//   | InvestLiquidity(minShares) -> failwith("00")
//   | DivestLiquidity(args) -> {
//     const res : (list(operation) * dex_storage) = divestLiquidityBody(args, s, this);
//     operations := res.0;
//     s := res.1;
//   }
//   | SetVotesDelegation(n) -> failwith("00")
//   | Vote(n) -> failwith("00")
//   | Veto(voter) -> failwith("00")
//   | WithdrawProfit(n) -> failwith("00")
//   | ITransfer(n) -> failwith("00")
//   | IApprove(n) -> failwith("00")
//   | IGetBalance(n) -> failwith("00")
//   | IGetAllowance(n) -> failwith("00")
//   | IGetTotalSupply(n) -> failwith("00")
//   end
// } with (operations, s)

// function receiveReward (const p : dexAction ; const s : dex_storage ; const this: address) :  (list(operation) * dex_storage) is 
// block {
//   s.currentCycle.reward := s.currentCycle.reward + Tezos.amount / 1mutez;
//   var operations : list(operation) := (nil: list(operation)); 
//   if s.currentCycle.nextCycle < Tezos.now then block {
//     s.currentCycle.nextCycle := Tezos.now;
//     s.currentCycle.cycleCoefficient := abs(Tezos.now - s.currentCycle.start) * s.currentCycle.reward / s.currentCycle.totalLoyalty + s.currentCycle.cycleCoefficient;
//     s.cycles[s.currentCycle.counter] := s.currentCycle;
//     s.currentCycle.reward := 0n;
//     s.currentCycle.counter := s.currentCycle.counter + 1n;
//     s.currentCycle.totalLoyalty := 0n;
//     s.currentCycle.start := Tezos.now;
//     s.currentCycle.nextCycle := Tezos.now + cyclePeriod;
//     if case s.delegated of None -> False
//       | Some(delegated) ->
//         case s.currentDelegated of None -> True
//           | Some(currentDelegated) -> delegated =/= currentDelegated
//         end
//       end
//     then {
//        operations := set_delegate(s.delegated) # operations;
//        s.currentDelegated := s.delegated;
//        s.vetoVoters := (big_map [] : big_map(address, nat));
//        s.veto := 0n;
//     } else skip ;
//   } else skip ;
//   s.currentCycle.totalLoyalty := s.currentCycle.totalLoyalty + abs(Tezos.now - s.currentCycle.lastUpdate) * s.totalSupply;
//   s.currentCycle.lastUpdate := Tezos.now;
// } with (operations, s)

function withdrawProfit (const p : dexAction; const s : dex_storage; const this : address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(n) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(n) -> failwith("00")
      | DivestLiquidity(n) -> failwith("00")
      | SetVotesDelegation(n) -> failwith("00")
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(receiver) -> {
          skip
          // var userCycle : user_cycle_info := get_force(Tezos.sender, s.loyaltyCycle);
          // var account : account_info := getAccount(Tezos.sender, s);
          // var share : nat := account.balance;
          // if userCycle.lastCycle =/= s.currentCycle.counter then {
          //   var cycle : cycle_info := get_force(userCycle.lastCycle, s.cycles);
          //   userCycle.reward := userCycle.reward + cycle.reward * (userCycle.loyalty + share * abs(cycle.nextCycle - userCycle.lastCycleUpdate)) / cycle.totalLoyalty;
          //   userCycle.loyalty := 0n;
          //   userCycle.lastCycleUpdate := cycle.start;
          // } else skip ;
          // if s.currentCycle.counter - userCycle.lastCycle > 1 then {
          //   const lastFullCycle : cycle_info = get_force(abs(s.currentCycle.counter - 1n), s.cycles);
          //   const lastUserCycle : cycle_info = get_force(userCycle.lastCycle, s.cycles);
          //   userCycle.reward := userCycle.reward + share * abs(lastFullCycle.cycleCoefficient - lastUserCycle.cycleCoefficient);
          // } else skip ;
          // userCycle.loyalty := userCycle.loyalty + share * abs(Tezos.now-userCycle.lastCycleUpdate);
          // userCycle.lastCycleUpdate := Tezos.now;
          // userCycle.lastCycle := s.currentCycle.counter;
          // share := userCycle.reward;
          // userCycle.reward := 0n;
          // s.loyaltyCycle[Tezos.sender] := userCycle;
          // operations := list [transaction(
          //   unit, 
          //   share * 1mutez, 
          //   (get_contract(receiver) : contract(unit)))];
      }
    end
  } with (operations, s)

const createDex : createDexFunc =
[%Michelson ( {| { UNPPAIIR ;
                  CREATE_CONTRACT 
#include "Dex.tz"
                  ;
                    PAIR } |}
           : createDexFunc)];
  
function launchExchange (const self : address; const token : address; const tokenAmount : nat; var s : full_exchange_storage) :  full_factory_return is
  block {
    if s.tokenList contains token then 
      failwith("Factory/exchange-launched") 
    else skip;
    if Tezos.amount < 1mutez or tokenAmount < 1n then 
      failwith("Dex/non-allowed") 
    else skip; 
    s.tokenList := Set.add (token, s.tokenList);

    const res : (operation * address) = createDex((None : option(key_hash)), 0tz, record [
      storage = 
        record [
            tezPool = Tezos.amount / 1mutez;      
            tokenPool = tokenAmount;      
            invariant = Tezos.amount / 1mutez * tokenAmount;      
            totalSupply = 1000n; 
            tokenAddress = token;      
            factoryAddress = self;      
            ledger = big_map[Tezos.sender -> record [
                balance = 1000n;
                allowances = (map [] : map(address, nat));
              ]
            ];
            voters = (big_map [] : big_map(address, vote_info));      
            vetos = (big_map [] : big_map(key_hash, timestamp));      
            votes = (big_map [] : big_map(key_hash, nat));      
            veto = 0n;      
            currentDelegated = (None: option(key_hash));      
            currentCandidate = (None: option(key_hash));      
            nextCandidate = (None: option(key_hash));      
            totalVotes = 0n;      
            rewardInfo = 
              record [
                reward = 0n;
                totalAccomulatedLoyalty = 0n;
                lastUpdateTime = Tezos.now;
                periodFinish = Tezos.now;
                rewardPerToken = 0n;    
              ];
            userRewards = (big_map [] : big_map(address, user_reward_info));      
        ];   
      dexLambdas = s.dexLambdas;
      tokenLambdas = s.tokenLambdas;
    ]);
    s.tokenToExchange[token] := res.1;
  } with (list[res.0;
    transaction(
      TransferType(Tezos.sender, (res.1, tokenAmount)), 
      0mutez, 
      getTokenContract(token)
    )
  ], s)

function setDexFunction (const idx : nat; const f : dexFunc; const s : full_exchange_storage) : full_exchange_storage is
block {
  case s.dexLambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.dexLambdas[idx] := f 
  end;
} with s
function setTokenFunction (const idx : nat; const f : tokenFunc; const s : full_exchange_storage) : full_exchange_storage is
block {
  case s.tokenLambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.tokenLambdas[idx] := f 
  end;
} with s

// function middle (const token : address; const tokenAmount : nat; var s : full_exchange_storage) : full_factory_return is
// block {
//   skip
//   // const res : factory_return = case s.lambdas[0n] of 
//   //   Some(f) -> f(Tezos.self_address, token, tokenAmount,  s.storage)
//   //   | None -> (failwith("Factory/function-not-set"): factory_return)
//   // end;
//   // s.storage := res.1;
// // } with (res.0, s)
// } with ((nil:list(operation)), s)

function main (const p : exchangeAction; const s : full_exchange_storage) : full_factory_return is 
  case p of
    | LaunchExchange(params) -> launchExchange(Tezos.self_address, params.token, params.tokenAmount, s)
    | SetDexFunction(params) -> ((nil:list(operation)), if params.index > 9n then (failwith("Factory/wrong-index") : full_exchange_storage) else setDexFunction(params.index, params.func, s))
    | SetTokenFunction(params) -> ((nil:list(operation)), if params.index > 4n then (failwith("Factory/wrong-index") : full_exchange_storage) else setTokenFunction(params.index, params.func, s))
  end

// record [  tokenList = (set[] : set(address));        
//   tokenToExchange = (big_map[] :big_map(address, address));        
//   dexLambdas = (big_map[] : big_map(nat, dexFunc));  
//   tokenLambdas = (big_map[] : big_map(nat, tokenFunc));]
// record [  tokenList = (set[] : set(address));        tokenToExchange = (big_map[] :big_map(address, address));        dexLambdas = (big_map[] : big_map(nat, dexFunc));  tokenLambdas = big_map[  0n -> transfer;   1n -> approve;   2n -> getBalance;   3n -> getAllowance;   4n -> getTotalSupply; ];]
// record [  tokenList = (set[] : set(address));        
//   tokenToExchange = (big_map[] :big_map(address, address));        
//   dexLambdas = (big_map[] : big_map(nat, dexFunc));  
//   tokenLambdas = big_map[
//     0n -> transfer; 
//     1n -> approve; 
//     2n -> getBalance; 
//     3n -> getAllowance; 
//     4n -> getTotalSupply; 
//   ];]
