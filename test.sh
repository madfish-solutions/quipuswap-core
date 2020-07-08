network="-p https://api.tez.ie/rpc/carthagenet"
echo "build"
node scripts/cli2.js build Dex --no-json -o contracts
node scripts/cli2.js build Factory
node scripts/cli2.js build Token

echo "deploy"
node scripts/cli2.js compile_storage Factory 'record   storage = record      tokenList = (set[] : set(address));      tokenToExchange = (big_map[] :big_map(address, address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end'
node scripts/cli2.js deploy -n Factory $network
sleep 3
node scripts/cli2.js deploy Token $network
sleep 3
node scripts/cli2.js deploy Token Token2 $network
sleep 3

echo "set settings"
node scripts/cli2.js set_settings 0 initializeExchange $network
sleep 3
node scripts/cli2.js set_settings 1 tezToToken $network
sleep 3
node scripts/cli2.js set_settings 2 tokenToTez $network
sleep 3
node scripts/cli2.js set_settings 3 tokenToTokenOut $network
sleep 3
node scripts/cli2.js set_settings 4 investLiquidity $network
sleep 3
node scripts/cli2.js set_settings 5 divestLiquidity $network
sleep 3
node scripts/cli2.js set_settings 6 setVotesDelegation $network
sleep 3
node scripts/cli2.js set_settings 7 vote $network
sleep 3
node scripts/cli2.js set_settings 8 veto $network
sleep 3
node scripts/cli2.js set_settings 9 receiveReward $network
sleep 3
node scripts/cli2.js set_settings 10 withdrawProfit $network
sleep 3
echo "test"
# ./node_modules/mocha/bin/mocha

