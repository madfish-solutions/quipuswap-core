node scripts/cli.js set_functions -f -i contractsV2 0 initializeExchange -p $npm_package_config_network 
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 1 tezToToken -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 2 tokenToTez -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 4 investLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 5 divestLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 6 setVotesDelegation -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 7 vote -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 8 veto -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 9 receiveReward -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions -f -i contractsV2 10 withdrawProfit -p $npm_package_config_network
sleep 3