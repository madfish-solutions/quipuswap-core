echo "build"
node scripts/cli2.js build Factory
node scripts/cli2.js build Token
node scripts/cli2.js build Dex

echo "deploy"
factory=`node scripts/cli2.js deploy Factory | cut -d' ' -f4`
echo "Factory deployed at: "$factory
sleep 1
token=`node scripts/cli2.js deploy Token | cut -d' ' -f4`
echo "Token deployed at: "$token
sleep 1
node scripts/cli2.js compile_storage Dex 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0tez;         counter = 0n;         start = Tezos.now; circleCoefficient = 0mutez;        lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, circle_info));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'
node scripts/cli2.js deploy -n Dex
sleep 1

token=`node scripts/cli2.js deploy Token Token2 | cut -d' ' -f4`
echo "Token deployed at: "$token
sleep 1
node scripts/cli2.js compile_storage Dex 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0tez;         counter = 0n;         start = Tezos.now; circleCoefficient = 0mutez;        lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, circle_info));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' Dex2
node scripts/cli2.js deploy -n Dex Dex2 Dex2
sleep 1

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
node scripts/cli2.js set_settings 9 receiveReward
node scripts/cli2.js set_settings 10 withdrawProfit
echo "set settings2"
node scripts/cli2.js set_settings 0 initializeExchange Dex2
node scripts/cli2.js set_settings 1 tezToToken Dex2
node scripts/cli2.js set_settings 2 tokenToTez Dex2
node scripts/cli2.js set_settings 3 tokenToTokenOut Dex2
node scripts/cli2.js set_settings 4 investLiquidity Dex2
node scripts/cli2.js set_settings 5 divestLiquidity Dex2
node scripts/cli2.js set_settings 6 setVotesDelegation Dex2
node scripts/cli2.js set_settings 7 vote Dex2
node scripts/cli2.js set_settings 8 veto Dex2
node scripts/cli2.js set_settings 9 receiveReward Dex2
node scripts/cli2.js set_settings 10 withdrawProfit Dex2
echo "test"
./node_modules/mocha/bin/mocha

