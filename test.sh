network="-p https://api.tez.ie/rpc/carthagenet"
echo "build"
npm run build

echo "deploy"
npm run deploy

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
./node_modules/mocha/bin/mocha

