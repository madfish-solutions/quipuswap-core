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
node scripts/cli2.js compile_storage Dex 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0n;         counter = 0n;         start = Tezos.now; circleCoefficient = 0n;        lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, circle_info));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end'
node scripts/cli2.js deploy -n Dex
sleep 1

token=`node scripts/cli2.js deploy Token Token2 | cut -d' ' -f4`
echo "Token deployed at: "$token
sleep 1
node scripts/cli2.js compile_storage Dex 'record   storage = record      feeRate = 500n;      tezPool = 0n;      tokenPool = 0n;      invariant = 0n;      totalShares = 0n;      tokenAddress = ("'$token'" : address);      factoryAddress = ("'$factory'" : address);      shares = (big_map end : big_map(address, nat));      voters = (big_map end : big_map(address, vote_info));      vetos = (big_map end : big_map(key_hash, timestamp));      vetoVoters = (big_map end : big_map(address, nat));      votes = (big_map end : big_map(key_hash, nat));      veto = 0n;      delegated = (None: option(key_hash));      currentDelegated = (None: option(key_hash));      totalVotes = 0n;      currentCircle = record         reward = 0n;         counter = 0n;         start = Tezos.now; circleCoefficient = 0n;        lastUpdate = Tezos.now;         totalLoyalty = 0n;         nextCircle = Tezos.now;       end;      circles = (big_map end : big_map(nat, circle_info));      circleLoyalty = (big_map end : big_map(address, user_circle_info));   end;   lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));end' Dex2
node scripts/cli2.js deploy -n Dex Dex2 Dex2
sleep 1

echo "set settings"
node scripts/cli2.js set_settings 0 initializeExchange
sleep 1
node scripts/cli2.js set_settings 1 tezToToken
sleep 1
node scripts/cli2.js set_settings 2 tokenToTez
sleep 1
node scripts/cli2.js set_settings 3 tokenToTokenOut
sleep 1
node scripts/cli2.js set_settings 4 investLiquidity
sleep 1
node scripts/cli2.js set_settings 5 divestLiquidity
sleep 1
node scripts/cli2.js set_settings 6 setVotesDelegation
sleep 1
node scripts/cli2.js set_settings 7 vote
sleep 1
node scripts/cli2.js set_settings 8 veto
sleep 1
node scripts/cli2.js set_settings 9 receiveReward
sleep 1
node scripts/cli2.js set_settings 10 withdrawProfit
sleep 1
echo "set settings2"
node scripts/cli2.js set_settings 0 initializeExchange Dex2
sleep 1
node scripts/cli2.js set_settings 1 tezToToken Dex2
sleep 1
node scripts/cli2.js set_settings 2 tokenToTez Dex2
sleep 1
node scripts/cli2.js set_settings 3 tokenToTokenOut Dex2
sleep 1
node scripts/cli2.js set_settings 4 investLiquidity Dex2
sleep 1
node scripts/cli2.js set_settings 5 divestLiquidity Dex2
sleep 1
node scripts/cli2.js set_settings 6 setVotesDelegation Dex2
sleep 1
node scripts/cli2.js set_settings 7 vote Dex2
sleep 1
node scripts/cli2.js set_settings 8 veto Dex2
sleep 1
node scripts/cli2.js set_settings 9 receiveReward Dex2
sleep 1
node scripts/cli2.js set_settings 10 withdrawProfit Dex2
echo "test"
./node_modules/mocha/bin/mocha

