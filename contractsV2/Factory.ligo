#include "IFactory.ligo"

// TODO:
//  - add veto update in invest/divest 

type transfer_type is TransferType of list (record [
  from_ : address;
  txs : list (record [
    to_ : address;
    token_id : nat;
    amount : nat;
  ]);
])

type token_lookup_type is TokenLookupType of (address * address * nat)
type use_type is UseType of (nat * dexAction) 

function initializeExchange (const p : dexAction ; const s : dex_storage ; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations : list(operation) := list[];
    case p of
    | InitializeExchange(tokenAmount) -> {
        if s.invariant =/= 0n 
          or s.totalShares =/= 0n 
          or Tezos.amount < 1mutez 
          or tokenAmount < 1n 
          or Tezos.amount > 500000000tz then failwith("Dex/non-allowed") else skip ; 
        s.tokenPool := tokenAmount;
        s.tezPool := Tezos.amount / 1mutez;
        s.invariant := s.tezPool * s.tokenPool;
        s.shares[Tezos.sender] := 1000n;
        s.totalShares := 1000n;
        
         // update user loyalty
        s.currentCircle.lastUpdate := Tezos.now;
        s.circleLoyalty[Tezos.sender] := record reward = 0n; loyalty = 0n; lastCircle = 0n; lastCircleUpdate = Tezos.now; end;  
        operations := transaction(
          TransferType(list[
            record[
              from_ = Tezos.sender; 
              txs = list [ record [
                  to_ = this; 
                  token_id = s.tokenId;
                  amount = tokenAmount;
                ]
              ]
            ]
          ]), 
          0mutez, 
          case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
            | None -> (failwith("01"):contract(transfer_type))
          end
          ) # operations;
    }
    | TezToTokenPayment(n) -> failwith("00")
    | TokenToTezPayment(n) -> failwith("00")
    | TokenToTokenPayment(n) -> failwith("00")
    | InvestLiquidity(n) -> failwith("00")
    | DivestLiquidity(n) -> failwith("00")
    | SetVotesDelegation(n) -> failwith("00")
    | Vote(n) -> failwith("00")
    | Veto(n) -> failwith("00")
    | WithdrawProfit(n) -> failwith("00")
    end
} with (operations, s)

function setVotesDelegation (const p : dexAction ; const s : dex_storage ; const this: address) :  (list(operation) * dex_storage) is
block {
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(n) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> 
     if Tezos.sender = n.0 then skip
     else block {
        const src: vote_info = case s.voters[Tezos.sender] of None -> record allowances = (set [] : set(address)); candidate = (None:option(key_hash)) end 
           | Some(v) -> v 
           end ;
        if Set.size(src.allowances) >= 5n and n.1 then failwith("Dex/many-voter-delegates") else {
           src.allowances := if n.1 then Set.add (n.0, src.allowances) else Set.remove (n.0, src.allowances) ;
           s.voters[Tezos.sender] := src;
        };
     }
  | Vote(n) -> failwith("00")
  | Veto(n) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with ((nil:list(operation)), s)

function redelegate (const voter : address; const candidate : key_hash; const prevShare : nat; const share : nat; var s: dex_storage) :  (dex_storage) is
block {
  case s.vetos[candidate] of None -> skip
    | Some(c) -> if c > Tezos.now then failwith ("Dex/veto-candidate") else remove candidate from map s.vetos
  end;
  const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(candidate); end;
  case s.voters[voter] of None -> skip
    | Some(v) -> {
      case v.candidate of None -> skip | Some(c) -> {
        if s.totalVotes < prevShare then failwith ("Dex/invalid-shares") else {
          s.totalVotes := abs(s.totalVotes - prevShare);
          s.votes[c]:= abs(get_force(c, s.votes) - prevShare);
          v.candidate := Some(candidate);

        } ;
      } end;
      voterInfo := v;
    }
    end;    
  if Tezos.sender = voter or voterInfo.allowances contains Tezos.sender then {
    s.voters[voter]:= voterInfo;
    s.totalVotes := s.totalVotes + share;
    const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share;
    s.votes[candidate]:= newVotes;
    if case s.delegated of None -> True 
      | Some(delegated) ->
        if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then True else False
      end
    then {
      s.delegated := Some(candidate);
    } else skip ;
  } else failwith ("Dex/vote-not-permitted");
} with (s)

function vote (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(n) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> 
      case s.shares[n.0] of None -> failwith ("Dex/no-shares")
      | Some(share) -> {
        case s.vetos[n.1] of None -> skip
          | Some(c) -> if c > Tezos.now then failwith ("Dex/veto-candidate") else remove n.1 from map s.vetos
        end; 
        const voterInfo : vote_info = record allowances = (set [] : set(address)); candidate = Some(n.1); end;
        case s.voters[n.0] of None -> skip
          | Some(v) -> 
            case v.candidate of None -> voterInfo := v 
              | Some(c) -> {
                if s.totalVotes < share then failwith ("Dex/invalid-shares") else {
                  s.totalVotes := abs(s.totalVotes - share);
                  s.votes[c]:= abs(get_force(c, s.votes) - share);
                  voterInfo := v;
                };
              } end
          end;    
        if Tezos.sender = n.0 or voterInfo.allowances contains Tezos.sender then {
          voterInfo.candidate := Some(n.1);
          s.voters[n.0]:= voterInfo;
          s.totalVotes := s.totalVotes + share;
          const newVotes: nat = (case s.votes[n.1] of  None -> 0n | Some(v) -> v end) + share;
          s.votes[n.1]:= newVotes;
          if case s.delegated of None -> True 
            | Some(delegated) ->
              if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then False else True
            end
          then
          {
             s.delegated := Some(n.1);
          } else skip ;
        } else failwith ("Dex/vote-not-permitted");
      }
      end
  | Veto(n) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with ((nil:list(operation)), s)

function veto (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(n) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> 
    case s.shares[voter] of None -> failwith ("Dex/no-voter")
    | Some(share) -> {
      const src : vote_info = case s.voters[voter] of None -> record allowances = (set [] : set(address)); candidate = (None: option(key_hash)); end
      | Some(src) -> src
      end;
      if Tezos.sender = voter or src.allowances contains Tezos.sender then {
        var newShare: nat := case s.vetoVoters[voter] of None -> share
          | Some(prev) ->
            if share > prev then abs(share - prev) else (failwith ("Dex/old-shares") : nat)
          end;
        s.veto := s.veto + newShare;
        if s.veto > s.totalVotes / 2n then {
            s.veto := 0n;
            case s.currentDelegated of None -> failwith ("Dex/no-delegated")
            | Some(c) -> {
              s.vetos[c] := Tezos.now + 7889229;
              s.currentDelegated := (None: option(key_hash));
              operations := set_delegate(s.currentDelegated) # operations;
              s.vetoVoters := (big_map end : big_map(address, nat));
            }
            end;
        } else skip ;
        s.vetoVoters[voter] := share;
      } else failwith ("Dex/vote-not-permitted");
    }
    end
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function tezToToken (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> 
    if Tezos.amount / 1mutez > 0n and n.0 > 0n then {
      s.tezPool := s.tezPool + Tezos.amount / 1mutez;
      const newTokenPool : nat = s.invariant / abs(s.tezPool - Tezos.amount / 1mutez / s.feeRate);
      const tokensOut : nat = abs(s.tokenPool - newTokenPool);
        if tokensOut >= n.0 then {
          s.tokenPool := newTokenPool;
          s.invariant := s.tezPool * newTokenPool;
          operations :=  transaction(
            TransferType(list[
              record[
                from_ = this; 
                txs = list [ record [
                    to_ = n.1; 
                    token_id = s.tokenId;
                    amount = tokensOut;
                  ]
                ]
              ]
            ]), 
            0mutez, 
            case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
              | None -> (failwith("01"):contract(transfer_type))
            end
            ) # operations;
      } else failwith("Dex/high-min-out");
    } else failwith("Dex/wrong-params")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(n) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function tokenToTez (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> 
    if n.0 > 0n and n.1 > 0n then {
      s.tokenPool := s.tokenPool + n.0;
      const newTezPool : nat = s.invariant / abs(s.tokenPool - n.0 / s.feeRate);
      const tezOut : nat = abs(s.tezPool - newTezPool);

      if tezOut >= n.1 then {
        s.tezPool := newTezPool;
        s.invariant := newTezPool * s.tokenPool;
        operations:= list transaction(
          TransferType(list[
            record[
              from_ = Tezos.sender; 
              txs = list [ record [
                  to_ = this; 
                  token_id = s.tokenId;
                  amount = n.0;
                ]
              ]
            ]
          ]), 
          0mutez, 
          case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
            | None -> (failwith("01"):contract(transfer_type))
          end); 
          transaction(unit, n.1 * 1mutez, (get_contract(n.2) : contract(unit))); end;
      } else failwith("Dex/high-min-tez-out");
  
    } else failwith("Dex/wrong-params")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(n) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function tokenToTokenOut (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> 
    if n.0 > 0n and n.1 > 0n then {
      s.tokenPool := s.tokenPool + n.0;
      const newTezPool : nat = s.invariant / abs(s.tokenPool - n.0 / s.feeRate);
      const tezOut : nat = abs(s.tezPool - newTezPool);
      s.tezPool := newTezPool;
      s.invariant := newTezPool * s.tokenPool;
      operations := list[transaction(
        TransferType(list[
          record[
            from_ = Tezos.sender; 
            txs = list [ record [
                to_ = this; 
                token_id = s.tokenId;
                amount = n.0;
              ]
            ]
          ]
        ]), 
        0mutez,          
        case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
          | None -> (failwith("01"):contract(transfer_type))
        end);
        transaction(TokenLookupType(n.2, n.3, n.1), 
        tezOut * 1mutez,          
        case (Tezos.get_entrypoint_opt("%tokenLookup", s.factoryAddress) : option(contract(token_lookup_type))) of Some(contr) -> contr
          | None -> (failwith("01"):contract(token_lookup_type))
        end);
      ];
    } else failwith("Dex/wrong-params")
  | InvestLiquidity(minShares) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function investLiquidity (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(minShares) -> {
    const tezPerShare : nat = s.tezPool / s.totalShares;
    const sharesPurchased : nat = (Tezos.amount / 1mutez) / tezPerShare;
    if minShares > 0n and tezPerShare > 0n and sharesPurchased >= minShares then skip else failwith("Dex/wrong-params");
    s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
    s.currentCircle.lastUpdate := Tezos.now;
    const tokensPerShare : nat = s.tokenPool / s.totalShares;
    const tokensRequired : nat = sharesPurchased * tokensPerShare;
    if tokensPerShare = 0n then failwith("Dex/dangerous-rate") else {
      const share : nat = case s.shares[Tezos.sender] of | None -> 0n | Some(share) -> share end;
      // update user loyalty
      var userCircle : user_circle_info := case s.circleLoyalty[Tezos.sender] of None -> record reward = 0n; loyalty = 0n; lastCircle = s.currentCircle.counter; lastCircleUpdate = Tezos.now; end
        | Some(c) -> c
      end;
      if userCircle.lastCircle =/= s.currentCircle.counter then {
        var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
        userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
        userCircle.loyalty := 0n;
        userCircle.lastCircleUpdate := circle.start;
      } else skip ;
      if s.currentCircle.counter - userCircle.lastCircle > 1 then {
        const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
        const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
        userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
      } else skip ;
      userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
      userCircle.lastCircleUpdate := Tezos.now;
      userCircle.lastCircle := s.currentCircle.counter;
      s.circleLoyalty[Tezos.sender] := userCircle;
      s.shares[Tezos.sender] := share + sharesPurchased;
      s.tezPool := s.tezPool + Tezos.amount / 1mutez;
      s.tokenPool := s.tokenPool + tokensRequired;
      s.invariant := s.tezPool * s.tokenPool;
      s.totalShares := s.totalShares + sharesPurchased;
      operations := transaction(
        TransferType(list[
          record[
            from_ = Tezos.sender; 
            txs = list [ record [
                to_ = this; 
                token_id = s.tokenId;
                amount = tokensRequired;
              ]
            ]
          ]
        ]),         
        0mutez, 
        case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
          | None -> (failwith("01"):contract(transfer_type))
        end
      ) # operations;
      case s.voters[Tezos.sender] of None -> skip
        | Some(v) -> { 
          case v.candidate of None -> skip 
          | Some(candidate) -> {
            case s.vetos[candidate] of None -> skip
              | Some(c) -> if c > Tezos.now then failwith ("Dex/veto-candidate") else
                remove candidate from map s.vetos
            end;
            if s.totalVotes < share then failwith ("Dex/invalid-shares") else {
              s.totalVotes := abs(s.totalVotes - share);
              s.votes[candidate]:= abs(get_force(candidate, s.votes) - share);
              v.candidate := Some(candidate);
            } ;
            s.voters[Tezos.sender]:= v;
            s.totalVotes := s.totalVotes + share + sharesPurchased;
            const newVotes: nat = (case s.votes[candidate] of  None -> 0n | Some(v) -> v end) + share + sharesPurchased;
            s.votes[candidate]:= newVotes;
            if case s.delegated of None -> True 
              | Some(delegated) ->
                if (case s.votes[delegated] of None -> 0n | Some(v) -> v end) > newVotes then True else False
              end
            then {
              s.delegated := Some(candidate);
            } else skip ;
          } end;
        } end;
    }; 
  }
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function divestLiquidity (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(minShares) -> failwith("00")
  | DivestLiquidity(n) -> {
      const share : nat = case s.shares[Tezos.sender] of | None -> 0n | Some(share) -> share end;
      if n.0 > 0n and n.0 <= share then {
        s.shares[Tezos.sender] := abs(share - n.0);

        s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
        s.currentCircle.lastUpdate := Tezos.now;

        const tezPerShare : nat = s.tezPool / s.totalShares;
        const tokensPerShare : nat = s.tokenPool / s.totalShares;
        const tezDivested : nat = tezPerShare * n.0;
        const tokensDivested : nat = tokensPerShare * n.0;

        if n.1 > 0n and n.2 > 0n and tezDivested >= n.1 and tokensDivested >= n.2 then {
          var userCircle : user_circle_info := get_force(Tezos.sender, s.circleLoyalty);
          if userCircle.lastCircle =/= s.currentCircle.counter then {
            case s.circles[userCircle.lastCircle] of Some(circle) -> {
              userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
              userCircle.loyalty := 0n;
              userCircle.lastCircleUpdate := circle.start;
            } 
            | None -> failwith("Dex/no-circle")
            end;
          } else skip ;

          if s.currentCircle.counter - userCircle.lastCircle > 1 then 
            case s.circles[abs(s.currentCircle.counter - 1n)] of 
              None -> failwith("Dex/no-full-circle")
              | Some(lastFullCircle) -> case s.circles[userCircle.lastCircle] of 
                None -> failwith("Dex/no-full-circle")
                | Some(lastUserCircle) -> userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient)
                end
              end
             else skip ;
          userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
          userCircle.lastCircleUpdate := Tezos.now;
          userCircle.lastCircle := s.currentCircle.counter;
          s.circleLoyalty[Tezos.sender] := userCircle;

          s.totalShares := abs(s.totalShares - n.0);
          s.tezPool := abs(s.tezPool - tezDivested);
          s.tokenPool := abs(s.tokenPool - tokensDivested);
          s.invariant := if s.totalShares = 0n then 0n; else s.tezPool * s.tokenPool;

          case s.voters[Tezos.sender] of None -> skip
            | Some(v) -> {
              case v.candidate of None -> skip | Some(candidate) -> {
                const prevVotes: nat = get_force(candidate, s.votes);
                s.votes[candidate]:= abs(prevVotes - n.0);
                if prevVotes = n.0 then remove Tezos.sender from map s.voters; else skip ;
              } end;
          } end;
          operations := list transaction(
            TransferType(list[
              record[
                from_ = this; 
                txs = list [ record [
                    to_ = Tezos.sender; 
                    token_id = s.tokenId;
                    amount = tokensDivested;
                  ]
                ]
              ]
            ]), 
            0mutez,          
            case (Tezos.get_entrypoint_opt("%transfer", s.tokenAddress) : option(contract(transfer_type))) of Some(contr) -> contr
              | None -> (failwith("01"):contract(transfer_type))
            end
          ); 
          transaction(unit, tezDivested * 1mutez, (get_contract(Tezos.sender) : contract(unit))); end;
        } else failwith("Dex/wrong-out");
      } else failwith("Dex/wrong-params");
  }
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> failwith("00")
  end
} with (operations, s)

function receiveReward (const p : dexAction ; const s : dex_storage ; const this: address) :  (list(operation) * dex_storage) is 
block {
  s.currentCircle.reward := s.currentCircle.reward + Tezos.amount / 1mutez;
  var operations : list(operation) := (nil: list(operation)); 
  if s.currentCircle.nextCircle < Tezos.now then block {
    s.currentCircle.nextCircle := Tezos.now;
    s.currentCircle.circleCoefficient := abs(Tezos.now - s.currentCircle.start) * s.currentCircle.reward / s.currentCircle.totalLoyalty + s.currentCircle.circleCoefficient;
    s.circles[s.currentCircle.counter] := s.currentCircle;
    s.currentCircle.reward := 0n;
    s.currentCircle.counter := s.currentCircle.counter + 1n;
    s.currentCircle.totalLoyalty := 0n;
    s.currentCircle.start := Tezos.now;
    // s.currentCircle.nextCircle := Tezos.now + 1474560;
    s.currentCircle.nextCircle := Tezos.now + 3;
    if case s.delegated of None -> False
      | Some(delegated) ->
        case s.currentDelegated of None -> True
          | Some(currentDelegated) -> delegated =/= currentDelegated
        end
      end
    then {
       operations := set_delegate(s.delegated) # operations;
       s.currentDelegated := s.delegated;
    } else skip ;
  } else skip ;
  s.currentCircle.totalLoyalty := s.currentCircle.totalLoyalty + abs(Tezos.now - s.currentCircle.lastUpdate) * s.totalShares;
  s.currentCircle.lastUpdate := Tezos.now;
} with (operations, s)

function withdrawProfit (const p : dexAction ; const s : dex_storage; const this: address) :  (list(operation) * dex_storage) is
block {
  var operations: list(operation) := list[];
  case p of
  | InitializeExchange(tokenAmount) -> failwith("00")
  | TezToTokenPayment(n) -> failwith("00")
  | TokenToTezPayment(n) -> failwith("00")
  | TokenToTokenPayment(n) -> failwith("00")
  | InvestLiquidity(minShares) -> failwith("00")
  | DivestLiquidity(n) -> failwith("00")
  | SetVotesDelegation(n) -> failwith("00")
  | Vote(n) -> failwith("00")
  | Veto(voter) -> failwith("00")
  | WithdrawProfit(n) -> {
    var userCircle : user_circle_info := get_force(Tezos.sender, s.circleLoyalty);
    var share : nat := get_force(Tezos.sender, s.shares);
    if userCircle.lastCircle =/= s.currentCircle.counter then {
      var circle : circle_info := get_force(userCircle.lastCircle, s.circles);
      userCircle.reward := userCircle.reward + circle.reward * (userCircle.loyalty + share * abs(circle.nextCircle - userCircle.lastCircleUpdate)) / circle.totalLoyalty;
      userCircle.loyalty := 0n;
      userCircle.lastCircleUpdate := circle.start;
    } else skip ;
    if s.currentCircle.counter - userCircle.lastCircle > 1 then {
      const lastFullCircle : circle_info = get_force(abs(s.currentCircle.counter - 1n), s.circles);
      const lastUserCircle : circle_info = get_force(userCircle.lastCircle, s.circles);
      userCircle.reward := userCircle.reward + share * abs(lastFullCircle.circleCoefficient - lastUserCircle.circleCoefficient);
    } else skip ;
    userCircle.loyalty := userCircle.loyalty + share * abs(Tezos.now-userCircle.lastCircleUpdate);
    userCircle.lastCircleUpdate := Tezos.now;
    userCircle.lastCircle := s.currentCircle.counter;
    share := userCircle.reward;
    userCircle.reward := 0n;
    s.circleLoyalty[Tezos.sender] := userCircle;
    operations := transaction(unit, share * 1mutez, (get_contract(n) : contract(unit))) # operations;
  }
  end
} with (operations, s)

function launchExchange (const self : address; const token : address; const tokenId : nat; var s: exchange_storage ) :  (list(operation) * exchange_storage) is
block {
  if s.tokenList contains token then failwith("Factory/exchange-launched") else skip ;
    s.tokenList := Set.add (token, s.tokenList);
    const createDex : (option(key_hash) * tez * full_dex_storage) -> (operation * address) =
    [%Michelson ( {| { UNPPAIIR ;
                      CREATE_CONTRACT 
#include "Dex.tz"
                  ;
                        PAIR } |}
               : (option(key_hash) * tez * full_dex_storage) -> (operation * address))];
  const res : (operation * address) = createDex((None : option(key_hash)), 0tz, record 
    storage = 
       record      
          feeRate = 333n;      
          tezPool = 0n;      
          tokenPool = 0n;      
          invariant = 0n;      
          totalShares = 0n;      
          tokenAddress = token;      
          tokenId = tokenId;      
          factoryAddress = self;
          shares = (big_map end : big_map(address, nat));      
          voters = (big_map end : big_map(address, vote_info));      
          vetos = (big_map end : big_map(key_hash, timestamp));      
          vetoVoters = (big_map end : big_map(address, nat));      
          votes = (big_map end : big_map(key_hash, nat));      
          veto = 0n;      
          delegated = (None: option(key_hash));      
          currentDelegated = (None: option(key_hash));      
          totalVotes = 0n;      
          currentCircle = 
            record         
              reward = 0n;         
              counter = 0n;         
              start = Tezos.now; 
              circleCoefficient = 0n;        
              lastUpdate = Tezos.now;         
              totalLoyalty = 0n;         
              nextCircle = Tezos.now;       
            end;
          circles = (big_map end : big_map(nat, circle_info));      
          circleLoyalty = (big_map end : big_map(address, user_circle_info));   
       end;   
    lambdas = s.lambdas;
    end);
  s.tokenToExchange[token] := res.1;
 } with (list[res.0], s)

function setFunction (const idx: nat; const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) ;const s : full_exchange_storage) : full_exchange_storage is
block {
  case s.storage.lambdas[idx] of 
    Some(n) -> failwith("Factory/function-set") 
    | None -> s.storage.lambdas[idx] := f 
  end;
} with s

function middle (const token : address ; const tokenId : nat ; var s : full_exchange_storage) :  (list(operation) * full_exchange_storage) is
block {
  const res : (list(operation) * exchange_storage) = case s.lambdas[0n] of 
    Some(f) -> f(Tezos.self_address, token, tokenId, s.storage)
    | None -> (failwith("Factory/function-not-set"): (list(operation) * exchange_storage)) 
  end;
  s.storage := res.1;
} with (res.0, s)

function main (const p : exchangeAction ; const s : full_exchange_storage) :
  (list(operation) * full_exchange_storage) is case p of
  LaunchExchange(n) -> middle(n.0, n.1, s)
  | TokenLookup(n) -> (
    list transaction(UseType(1n, TezToTokenPayment(n.2, n.1)), 
      Tezos.amount, 
      case (Tezos.get_entrypoint_opt("%use", get_force(n.0, s.storage.tokenToExchange)) : option(contract(use_type))) of Some(contr) -> contr
        | None -> (failwith("01"):contract(use_type))
      end
    ) end,
    s)
  | SetFunction(n) -> ((nil:list(operation)), if n.0 > 10n then (failwith("Factory/wrong-index") : full_exchange_storage) else  setFunction(n.0, n.1, s))
 end
