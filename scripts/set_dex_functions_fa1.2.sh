node scripts/cli.js set_dex_functions 0 initializeExchange -p $npm_package_config_network 
sleep 3
node scripts/cli.js set_dex_functions 1 tezToToken -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 2 tokenToTez -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 3 withdrawProfit -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 4 investLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 5 divestLiquidity -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 6 vote -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 7 veto -p $npm_package_config_network
sleep 3
node scripts/cli.js set_dex_functions 8 receiveReward -p $npm_package_config_network
sleep 3
