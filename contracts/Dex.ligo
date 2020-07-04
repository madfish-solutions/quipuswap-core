#include "IDex.ligo"

function middle (const p : dexAction ; const this: address; const idx: nat; const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(idx, s.lambdas);
    const res : (list(operation) * dex_storage) = f(p, s.storage, this);
    s.storage := res.1;
 } with (res.0, s)

function useDefault (const s : full_dex_storage) :  (list(operation) * full_dex_storage) is
 block {
    const f: (dexAction * dex_storage * address) -> (list(operation) * dex_storage) = get_force(9n, s.lambdas);
    const res : (list(operation) * dex_storage) = f(InitializeExchange(0n), s.storage, Tezos.self_address);
    s.storage := res.1;
 } with (res.0, s)



function setSettings (const m: big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)) ;const s : full_dex_storage) : full_dex_storage is
 block {
    if Tezos.sender =/= s.storage.factoryAddress then failwith("Dex/not-permitted") else skip;
   //  if idx > 10n then failwith("Dex/all-functions-set") else skip;
   //  case s.lambdas[idx] of Some(n) -> failwith("Dex/function-set") | None -> skip end;
    s.lambdas := m;
 } with s

function main (const p : fullAction ; const s : full_dex_storage) :
  (list(operation) * full_dex_storage) is
 block {
    const this: address = self_address; 
 } with case p of
  | Default -> useDefault(s) 
  | Use(n) -> middle(n.1, this, n.0, s) 
  | SetSettings(n) -> ((nil:list(operation)), setSettings(n, s))
 end


// const initial_storage : full_dex_storage = 
// record
//    storage = record
//       feeRate = 500n;
//       tezPool = 0n;
//       tokenPool = 0n;
//       invariant = 0n;
//       totalShares = 0n;
//       tokenAddress = ("'$token'" : address);
//       factoryAddress = ("'$factory'" : address);
//       shares = (big_map end : big_map(address, nat));
//       voters = (big_map end : big_map(address, vote_info));
//       vetos = (big_map end : big_map(key_hash, timestamp));
//       vetoVoters = (big_map end : big_map(address, nat));
//       votes = (big_map end : big_map(key_hash, nat));
//       veto = 0n;
//       delegated = (None: option(key_hash));
//       currentDelegated = (None: option(key_hash));
//       totalVotes = 0n;
//       currentCircle = 0n;
//       nextCircle = timestamp;
//       reward = 0tz;
//       circles = (big_map end : big_map(nat, tez));
//    end;
//    lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
// end;

// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'  --michelson-format=json > storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("KT1AXdTEv1ZFpeokMZCGVLaEWV2QHfXMAfc2" : address);      factoryAddress = ("KT1TmyWYmkUTYvYsXJjW3WyTDkV7ckRex5Mx" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = big_map[0n -> initializeExchange; 1n -> tezToToken; 2n -> tokenToTez; 3n -> tokenToTokenOut; 4n -> investLiquidity; 5n -> divestLiquidity; 6n -> setVotesDelegation; 7n -> vote; 8n -> veto];end'  --michelson-format=json > storage/Dex.json

// ligo compile-storage contracts/Dex.ligo main 'record
//    storage = record
//       feeRate = 500n;
//       tezPool = 0n;
//       tokenPool = 0n;
//       invariant = 0n;
//       totalShares = 0n;
//       tokenAddress = ("'$token'" : address);
//       factoryAddress = ("'$factory'" : address);
//       shares = (big_map end : big_map(address, nat));
//       voters = (big_map end : big_map(address, vote_info));
//       vetos = (big_map end : big_map(key_hash, timestamp));
//       vetoVoters = (big_map end : big_map(address, nat));
//       votes = (big_map end : big_map(key_hash, nat));
//       veto = 0n;
//       delegated = (None: option(key_hash));
//       currentDelegated = (None: option(key_hash));
//       totalVotes = 0n;
//       currentCircle = record
//          reward = 0tez;
//          counter = 0n;
//          start = Tezos.now;
//          lastUpdate = Tezos.now;
//          totalLoyalty = 0n;
//          nextCircle = Tezos.now;
//        end;
//       circles = (big_map end : big_map(nat, circle_info));
//       circleLoyalty = (big_map end : big_map(address, user_circle_info));
//    end;
//    lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));
// end' --michelson-format=json > ./storage/Dex.json

// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = 0n;      nextCircle = timestamp;      reward = 0tz;      circles = (big_map end : big_map(nat, tez));   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' --michelson-format=json > ./storage/Dex.json
// ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0tez;         counter = 0n;         start = Tezos.now;         lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, tez));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' --michelson-format=json > ./storage/Dex.json
