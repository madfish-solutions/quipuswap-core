node scripts/cli.js set_token_functions 0 transfer -p $npm_package_config_network 
sleep 3
node scripts/cli.js set_token_functions 1 approve -p $npm_package_config_network
sleep 3
node scripts/cli.js set_token_functions 2 getBalance -p $npm_package_config_network
sleep 3
node scripts/cli.js set_token_functions 3 getAllowance -p $npm_package_config_network
sleep 3
node scripts/cli.js set_token_functions 4 getTotalSupply -p $npm_package_config_network
sleep 3

