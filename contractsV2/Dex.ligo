#include "IGateway.ligo"

function main (const p : dexAction ; const s : dex_storage) :
  (list(operation) * dex_storage) is
 block {
skip   //  if get_force(Tezos.sender, s.allowed) then skip else failwith ("Not permitted");
 } with case p of
//   | GetStorage -> ((nil: list(operation)), s) 
  | GetStorage -> (list transaction(ReceiveDexStorage(s), Tezos.amount, (get_contract(c): contract(gatewayAction))); end, s) 
  | UpdateStorage(n) -> ((nil: list(operation)), n) 
//   | Default(n) -> ((nil: list(operation)), s) 
 end

 


// // IDex.ligo
// type vote_info is record
//   allowances: map(address, bool);
//   candidate: option(key_hash);
// end

// type dex_storage is record 
//   feeRate: nat;
//   tezPool: nat;
//   tokenPool: nat;
//   invariant: nat;
//   totalShares: nat;
//   tokenAddress: address;
//   factoryAddress: address;
//   shares: big_map(address, nat);
//   voters: big_map(address, vote_info);
//   vetos: big_map(key_hash, bool);
//   vetoVoters: big_map(address, nat);
//   votes: big_map(key_hash, nat);
//   veto: nat;
//   delegated: key_hash;
//   nextDelegated: key_hash;
//   allowed: big_map(address, bool);
// end

// type dexAction is
// | UpdateStorage of (dex_storage)
// | GetStorage

// // IGateway.ligo
// type gateway_storage is 
// record
//   main: address;
//   tmp: (nat);
// end

// type gatewayAction is
// | ReceiveDexStorage of (unit)
// | Use of (nat)

// // Dex.ligo
// #include "IGateway.ligo"

// function main (const p : dexAction ; const s : dex_storage) :
//   (list(operation) * dex_storage) is case p of
//   | GetStorage -> ((nil: list(operation)), s) 
//   | UpdateStorage(n) -> ((nil: list(operation)), n) 
// end

// // InitializeExchange.ligo
// #include "IGateway.ligo"

// function main (const p : gatewayAction ; const s : gateway_storage) :
//   (list(operation) * gateway_storage) is block {
//      const c : contract(dexAction) = get_contract(s.main);
//   } with ((nil:list(operation)), s)