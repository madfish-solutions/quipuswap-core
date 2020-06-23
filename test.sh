echo "build"
node scripts/cli2.js build Token
node scripts/cli2.js build Dex

echo "deploy"
factory=`node scripts/cli2.js deploy Factory | cut -d' ' -f4`
sleep 5
token=`node scripts/cli2.js deploy Token | cut -d' ' -f4`
sleep 5
ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'  --michelson-format=json > ./storage/Dex.json
node scripts/cli2.js deploy -n Dex
sleep 5

token=`node scripts/cli2.js deploy Token Token2 | cut -d' ' -f4`
sleep 5
ligo compile-storage contracts/Dex.ligo main 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, bool));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);      nextDelegated = ("tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5" : key_hash);   end; lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'  --michelson-format=json > ./storage/Dex2.json
node scripts/cli2.js deploy -n Dex Dex2 Dex2
sleep 5

echo "set settings"
node scripts/cli2.js set_settings 0 initializeExchange
node scripts/cli2.js set_settings 1 tezToToken
node scripts/cli2.js set_settings 2 tokenToTez
node scripts/cli2.js set_settings 3 tokenToTokenOut
node scripts/cli2.js set_settings 4 investLiquidity
node scripts/cli2.js set_settings 5 divestLiquidity
node scripts/cli2.js set_settings 6 setVotesDelegation
node scripts/cli2.js set_settings 7 vote
node scripts/cli2.js set_settings 8 veto
# echo "test"
# ./node_modules/mocha/bin/mocha
