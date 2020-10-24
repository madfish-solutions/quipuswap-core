#include "../partials/IFactory.ligo"

// types for internal transaction calls
type transfer_type is TransferType of michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")

// helpers
function getTokenContract(const tokenAddress : address) : contract(transfer_type) is 
    case (Tezos.get_entrypoint_opt("%transfer", tokenAddress) : option(contract(transfer_type))) of 
      Some(contr) -> contr
      | None -> (failwith("01"):contract(transfer_type))
    end;

(* Helper function to get account *)
function getAccount (const addr : address; const s : dex_storage) : account_info is
  block {
    var acct : account_info :=
      record [
        balance         = 0n;
        frozenBalance   = 0n;
        allowances      = (map [] : map (address, nat));
      ];
    case s.ledger[addr] of
      None -> skip
    | Some(instance) -> acct := instance
    end;
  } with acct

(* Helper function to get voter info *)
function getVoter (const addr : address; const s : dex_storage) : vote_info is
  block {
    var acct : vote_info :=
      record [
        candidate   = (None : option(key_hash));
        vote        = 0n;
        veto        = 0n;
        lastVeto    = Tezos.now;
      ];
    case s.voters[addr] of
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

function updateReward (const s : dex_storage) : dex_storage is
  block {
    (* update rewards info *)
    s.rewardInfo.totalAccomulatedLoyalty := s.rewardInfo.totalAccomulatedLoyalty + abs(Tezos.now - s.rewardInfo.lastUpdateTime) * accurancyMultiplier / s.totalSupply;
    s.rewardInfo.lastUpdateTime := Tezos.now;

    (* check reward update*)
    if Tezos.now > s.rewardInfo.periodFinish then block {
      s.rewardInfo.rewardPerToken := s.rewardInfo.rewardPerToken + s.rewardInfo.reward * accurancyMultiplier * accurancyMultiplier / s.rewardInfo.totalAccomulatedLoyalty;
      s.rewardInfo.periodFinish := Tezos.now + votingPeriod;
      s.rewardInfo.reward := 0n;
    } else skip;
  } with s

function updateUserReward (const addr : address; const account: account_info; const newBalance: nat; const s : dex_storage) : dex_storage is
  block {
    (* update user loyalty *)
    var userRewardInfo : user_reward_info := getUserRewardInfo(addr, s);
    const currentLoyalty : nat = (account.balance + account.frozenBalance) * s.rewardInfo.totalAccomulatedLoyalty;
    userRewardInfo.loyalty := userRewardInfo.loyalty + abs(currentLoyalty - userRewardInfo.loyaltyPaid);
    userRewardInfo.loyaltyPaid := newBalance * s.rewardInfo.totalAccomulatedLoyalty;

    (* update user reward *)
    const currentReward : nat = s.rewardInfo.totalAccomulatedLoyalty * s.rewardInfo.rewardPerToken;
    userRewardInfo.reward := userRewardInfo.loyalty + abs(currentReward - userRewardInfo.rewardPaid);
    userRewardInfo.rewardPaid := currentReward;
    s.userRewards[addr] := userRewardInfo;
  } with s

(* Transfer token to another account *)
function transfer (const p : tokenAction; const s : dex_storage) : return is
  block {
    case p of
    | ITransfer(params) -> {
      s := updateReward(s);

      const value : nat = params.1.1;
      if params.0 = params.1.0 then
        failwith("Dex/selt-transfer")
      else skip;
      const senderAccount : account_info = getAccount(params.0, s);
      if senderAccount.balance < value then
        failwith("Dex/not-enough-balance")
      else skip;
      if params.0 =/= Tezos.sender then block {
        const spenderAllowance : nat = getAllowance(senderAccount, Tezos.sender, s);
        if spenderAllowance < value then
          failwith("Dex/not-enough-allowance")
        else skip;
        senderAccount.allowances[Tezos.sender] := abs(spenderAllowance - value);
      } else skip;

      s := updateUserReward(params.0, senderAccount, abs(senderAccount.balance - value) + senderAccount.frozenBalance,  s);

      senderAccount.balance := abs(senderAccount.balance - value);
      s.ledger[params.0] := senderAccount;

      var destAccount : account_info := getAccount(params.1.0, s);

      s := updateUserReward(params.1.0, destAccount, destAccount.balance + value + destAccount.frozenBalance, s);

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
        failwith("Dex/selt-approval")
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
              frozenBalance    = 0n;
              allowances = (map [] : map (address, nat));
            ];
          s.totalSupply := 1000n; 

          (* update rewards info *)
          s.rewardInfo.lastUpdateTime := Tezos.now;
          s.rewardInfo.periodFinish := Tezos.now + votingPeriod;
          
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
        | Vote(n) -> failwith("00")
        | Veto(n) -> failwith("00")
        | WithdrawProfit(n) -> failwith("00")
      end
  } with (operations, s)

function vote (const p : dexAction; const s : dex_storage; const this: address) :  return is
  block {
    case p of
      | InitializeExchange(tokenAmount) -> failwith("00")
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

            const voterInfo : vote_info = getVoter(args.voter, s);
            if account.balance + voterInfo.vote < args.value then
              failwith("Dex/not-enough-balance")
            else skip;
            if args.voter =/= Tezos.sender then block {
              const spenderAllowance : nat = getAllowance(account, Tezos.sender, s);
              if spenderAllowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spenderAllowance - args.value);
            } else skip;
            
            (* remove prev *)
            case voterInfo.candidate of 
              | None -> skip
              | Some(candidate) -> 
                case s.votes[candidate] of 
                  | None -> failwith("Dex/no-votes") 
                  | Some(v) -> 
                    s.votes[candidate] := abs(v - voterInfo.vote)
                end
            end;

            account.balance := abs(account.balance + voterInfo.vote - args.value);
            account.frozenBalance := abs(account.frozenBalance - voterInfo.vote + args.value);
            s.ledger[args.voter] := account;
            s.totalVotes := abs(s.totalVotes + args.value - voterInfo.vote);
            voterInfo.candidate := Some(args.candidate);
            voterInfo.vote := args.value;
            s.voters[args.voter] := voterInfo;

            const newVotes: nat = (case s.votes[args.candidate] of  None -> 0n | Some(v) -> v end) + args.value;
            s.votes[args.candidate] := newVotes;
            if case s.currentCandidate of None -> True 
              | Some(delegated) ->
                if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then 
                  False 
                else 
                  True
              end then 
                s.currentCandidate := Some(args.candidate);
            else skip;
        }
        end
      }
      | Veto(n) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with ((nil:list(operation)), s)

function veto (const p : dexAction; const s : dex_storage; const this: address) : return is
  block {
    var operations: list(operation) := list[];
    case p of
      | InitializeExchange(tokenAmount) -> failwith("00")
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

            const voterInfo : vote_info = getVoter(args.voter, s);
            if account.balance + voterInfo.veto < args.value then
              failwith("Dex/not-enough-balance")
            else skip;
            if args.voter =/= Tezos.sender then block {
              const spenderAllowance : nat = getAllowance(account, Tezos.sender, s);
              if spenderAllowance < args.value then
                failwith("Dex/not-enough-allowance")
              else skip;
              account.allowances[Tezos.sender] := abs(spenderAllowance - args.value);
            } else skip;

            account.balance := abs(account.balance + voterInfo.veto - args.value);
            account.frozenBalance := abs(account.frozenBalance - voterInfo.veto + args.value);
            s.ledger[args.voter] := account;

            if s.lastVeto > voterInfo.lastVeto then 
              voterInfo.veto := 0n
            else skip;
            
            s.veto := abs(s.veto + args.value - voterInfo.veto);
            voterInfo.veto := args.value;
            voterInfo.lastVeto := Tezos.now;
            s.voters[args.voter] := voterInfo;

            if s.veto > s.totalVotes / 2n then {
                s.veto := 0n;
                s.lastVeto := Tezos.now;
                case s.currentDelegated of None -> skip
                | Some(d) -> {
                  s.vetos[d] := Tezos.now + vetoPeriod;
                  case s.currentCandidate of None -> skip
                  | Some(c) -> {
                    if d = c then block {
                      s.currentDelegated := (None: option(key_hash));
                      s.currentCandidate := (None: option(key_hash));
                    }
                    else s.currentDelegated := s.currentCandidate;
                  }
                  end;
                  operations := set_delegate(s.currentDelegated) # operations;
                }
                end;
            } else skip;
          }
        end
      }
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

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
        s := updateReward(s);

        const tokensRequired : nat = sharesPurchased * s.tokenPool / s.totalSupply;
        if tokensRequired = 0n then failwith("Dex/dangerous-rate") else {
          var account : account_info := getAccount(Tezos.sender, s);
          const share : nat = account.balance;

          s := updateUserReward(Tezos.sender, account, share + sharesPurchased + account.frozenBalance, s);

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
      | Vote(n) -> failwith("00")
      | Veto(voter) -> failwith("00")
      | WithdrawProfit(n) -> failwith("00")
    end
  } with (operations, s)

function divestLiquidity (const p : dexAction; const s : dex_storage; const this: address) :  return is
  block {
    var operations: list(operation) := list[];
      case p of
      | InitializeExchange(tokenAmount) -> failwith("00")
      | TezToTokenPayment(n) -> failwith("00")
      | TokenToTezPayment(n) -> failwith("00")
      | InvestLiquidity(minShares) -> failwith("00")
      | DivestLiquidity(args) -> {
        var account : account_info := getAccount(Tezos.sender, s);
        const share : nat = account.balance;
        if args.shares > 0n and args.shares <= share then block {
          s := updateReward(s);

          s := updateUserReward(Tezos.sender, account, abs(share - args.shares) + account.frozenBalance,s);

          account.balance := abs(share - args.shares);
          s.ledger[Tezos.sender] := account;

          const tezDivested : nat = s.tezPool * args.shares / s.totalSupply;
          const tokensDivested : nat = s.tokenPool * args.shares / s.totalSupply;

          s.totalSupply := abs(s.totalSupply - args.shares);
          s.tezPool := abs(s.tezPool - tezDivested);
          s.tokenPool := abs(s.tokenPool - tokensDivested);
          s.invariant := if s.totalSupply = 0n then 0n; else s.tezPool * s.tokenPool;

          operations := list [
            transaction(
              TransferType(this, (Tezos.sender, tokensDivested)), 
              0mutez,          
              getTokenContract(s.tokenAddress)
            ); 
            transaction(
              unit, 
              tezDivested * 1mutez, 
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

function receiveReward (const p : dexAction; const s : dex_storage; const this : address) : return is 
  block {
    var operations : list(operation) := list[];
    s := updateReward(s);
  
    (* check reward update*)
    if Tezos.now > s.rewardInfo.periodFinish then block {
      s.rewardInfo.rewardPerToken := s.rewardInfo.rewardPerToken + s.rewardInfo.reward * accurancyMultiplier * accurancyMultiplier / s.rewardInfo.totalAccomulatedLoyalty;
      s.rewardInfo.periodFinish := Tezos.now + votingPeriod;
      s.rewardInfo.reward := 0n;
      if case s.currentDelegated of
        | None -> case s.currentCandidate of
          | None -> False
          | Some(c) -> True
          end
        | Some(current) -> case s.currentCandidate of
          | None -> True
          | Some(next) -> current =/= next
          end
      end then {
        s.currentDelegated := s.currentCandidate;
        operations := set_delegate(s.currentDelegated) # operations;
      } else skip;
    } else skip;
    s.rewardInfo.reward := s.rewardInfo.reward + Tezos.amount / 1mutez;
  } with (operations, s)

function withdrawProfit (const p : dexAction; const s : dex_storage; const this : address) : return is
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
        var account : account_info := getAccount(Tezos.sender, s);
        const share : nat = account.balance;

        s := updateReward(s);

        s := updateUserReward(Tezos.sender, account, account.balance + account.frozenBalance, s);

        var userRewardInfo : user_reward_info := getUserRewardInfo(Tezos.sender, s);
        const currentReward : nat = s.rewardInfo.totalAccomulatedLoyalty * s.rewardInfo.rewardPerToken;
        const reward : nat = userRewardInfo.loyalty + abs(currentReward - userRewardInfo.rewardPaid);
        userRewardInfo.reward := 0n;
        userRewardInfo.rewardPaid := currentReward;
        s.userRewards[Tezos.sender] := userRewardInfo;
        
        operations := list [transaction(
          unit, 
          reward / accurancyMultiplier * 1mutez, 
          (get_contract(receiver) : contract(unit)))];
      }
    end
  } with (operations, s)

const createDex : createDexFunc =
[%Michelson ( {| { UNPPAIIR ;
                  CREATE_CONTRACT 
#include "CompiledDex.tz"
                  ;
                    PAIR } |}
           : createDexFunc)];
  
function launchExchange (const self : address; const token : address; const tokenAmount : nat; var s : exchange_storage) :  full_factory_return is
  block {
    if s.tokenList contains token then 
      failwith("Factory/exchange-launched") 
    else skip;
    if Tezos.amount < 1mutez or tokenAmount < 1n then 
      failwith("Dex/not-allowed") 
    else skip; 
    s.tokenList := Set.add (token, s.tokenList);

    const res : (operation * address) = createDex((None : option(key_hash)), Tezos.amount, record [
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
                frozenBalance = 0n;
                allowances = (map [] : map(address, nat));
              ]
            ];
            voters = (big_map [] : big_map(address, vote_info));      
            vetos = (big_map [] : big_map(key_hash, timestamp));      
            votes = (big_map [] : big_map(key_hash, nat));      
            veto = 0n;      
            lastVeto = Tezos.now;
            currentDelegated = (None: option(key_hash));      
            currentCandidate = (None: option(key_hash));      
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

function setDexFunction (const idx : nat; const f : dexFunc; const s : exchange_storage) : exchange_storage is
block {
  case s.dexLambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.dexLambdas[idx] := f 
  end;
} with s
function setTokenFunction (const idx : nat; const f : tokenFunc; const s : exchange_storage) : exchange_storage is
block {
  case s.tokenLambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.tokenLambdas[idx] := f 
  end;
} with s

function main (const p : exchangeAction; const s : exchange_storage) : full_factory_return is 
  case p of
    | LaunchExchange(params) -> launchExchange(Tezos.self_address, params.token, params.tokenAmount, s)
    | SetDexFunction(params) -> ((nil:list(operation)), if params.index > 8n then (failwith("Factory/wrong-index") : exchange_storage) else setDexFunction(params.index, params.func, s))
    | SetTokenFunction(params) -> ((nil:list(operation)), if params.index > 4n then (failwith("Factory/wrong-index") : exchange_storage) else setTokenFunction(params.index, params.func, s))
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
