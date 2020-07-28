node scripts/cli.js set_functions 0 initializeExchange -p $npm_package_config_network 
sleep 3
node scripts/cli.js set_functions 1 tezToToken -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 2 tokenToTez -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 3 withdrawProfit -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 4 investLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 5 divestLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 6 setVotesDelegation -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 7 vote -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 8 veto -p $npm_package_config_network
sleep 3
node scripts/cli.js set_functions 9 receiveReward -p $npm_package_config_network
sleep 3
