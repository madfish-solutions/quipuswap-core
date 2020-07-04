echo "build"
node scripts/cli2.js build Factory
node scripts/cli2.js build Token
node scripts/cli2.js build Dex

echo "deploy"
node scripts/cli2.js compile_storage Factory 'record   storage = record      tokenList = (set[] : set(address));      tokenToExchange = (big_map[] :big_map(address, address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end'
node scripts/cli2.js deploy -n Factory
sleep 1
node scripts/cli2.js deploy Token
sleep 1
node scripts/cli2.js deploy Token Token2
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
echo "test"
./node_modules/mocha/bin/mocha

