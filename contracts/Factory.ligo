#include "IFactory.ligo"

const createDex : (option(key_hash) * tez * full_dex_storage) -> (operation * address) =
  [%Michelson ( {| { UNPPAIIR ;
                     CREATE_CONTRACT 
#include "Dex.tz"
              
               ;

                     PAIR } |}
              : (option(key_hash) * tez * full_dex_storage) -> (operation * address))]



type x is Use1 of (nat * dexAction) 
function launchExchange (const token : address; var s: exchange_storage ) :  (list(operation) * exchange_storage) is
 block {
    if s.tokenList contains token then failwith("Exchange launched") else skip;
   //  case s.exchangeToToken[exchange] of | None -> skip | Some(t) -> failwith("Exchange launched") end;
    s.tokenList := Set.add (token, s.tokenList);
   //  const init : full_dex_storage = (record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = token;      factoryAddress = Tezos.self_address;      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0n;         counter = 0n;         start = Tezos.now; circleCoefficient = 0n;        lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, circle_info));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end: full_dex_storage) ;
   //  const init : full_dex_storage = 
   //  record 
   //    storage = 
   //       record      
   //          feeRate = 500n;      
   //          tezPool = 0n;      
   //          tokenPool = 0n;      
   //          invariant = 0n;      
   //          totalShares = 0n;      
   //          tokenAddress = token;      
   //          factoryAddress = token;      
   //          shares = (big_map end : big_map(address, nat));      
   //          voters = (big_map end : big_map(address, vote_info));      
   //          vetos = (big_map end : big_map(key_hash, timestamp));      
   //          vetoVoters = (big_map end : big_map(address, nat));      
   //          votes = (big_map end : big_map(key_hash, nat));      
   //          veto = 0n;      
   //          delegated = (None: option(key_hash));      
   //          currentDelegated = (None: option(key_hash));      
   //          totalVotes = 0n;      
   //          currentCircle = 
   //             record         
   //                reward = 0n;         
   //                counter = 0n;         
   //                start = Tezos.now; 
   //                circleCoefficient = 0n;        
   //                lastUpdate = Tezos.now;         
   //                totalLoyalty = 0n;         
   //                nextCircle = Tezos.now;       
   //             end;
   //          circles = (big_map end : big_map(nat, circle_info));      
   //          circleLoyalty = (big_map end : big_map(address, user_circle_info));   
   //       end;   
   //    lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
   //    end;
    const res : (operation * address) = createDex((None : option(key_hash)), 0tz, record 
      storage = 
         record      
            feeRate = 500n;      
            tezPool = 0n;      
            tokenPool = 0n;      
            invariant = 0n;      
            totalShares = 0n;      
            tokenAddress = token;      
            factoryAddress = token;      
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
      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
      end);
   //  Tezos.create_contract (get_force(0n, fm), (None : option(key_hash)), 3tz, Tezos.sender);
    s.tokenToExchange[token] := res.1;
    s.exchangeToToken[res.1] := token;
 } with (list[res.0], s)

function tokenToExchangeLookup (const tokenOutAddress : address; const recipient: address; const minTokensOut: nat; const s : exchange_storage) :  list(operation) is
 list transaction(Use1(1n, TezToTokenPayment(minTokensOut, recipient)), 
   Tezos.amount, 
   case (Tezos.get_entrypoint_opt("%use", get_force(tokenOutAddress, s.tokenToExchange)) : option(contract(x))) of Some(contr) -> contr
         | None -> (failwith("01"):contract(x))
         end
   )
 end 

function setSettings (const idx: nat; const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) ;const s : exchange_storage) : exchange_storage is
 block {
    if idx > 10n then failwith("Factory/functions-set") else skip;
    case s.lambdas[idx] of Some(n) -> failwith("Factory/function-set") | None -> skip end;
    s.lambdas[idx] := f;
 } with s

function main (const p : exchangeAction ; const s : exchange_storage) :
  (list(operation) * exchange_storage) is case p of
    LaunchExchange(n) -> launchExchange(n, s)
  | TokenToExchangeLookup(n) -> (tokenToExchangeLookup(n.0, n.1, n.2, s), s)
  | ConfigDex(n) -> (list transaction(SetSettings(n.0, get_force(n.0, s.lambdas)),
      0tez,
      (get_contract(n.1): contract(fullAction))) end, s)
  | SetFunction(n) -> ((nil:list(operation)), setSettings(n.0, n.1, s))
 end
