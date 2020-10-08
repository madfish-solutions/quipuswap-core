node scripts/cli.js compile_storage Factory 'record [  tokenList = (set[] : set(address));        tokenToExchange = (big_map[] :big_map(address, address));        dexLambdas = (big_map[] : big_map(nat, dexFunc));  tokenLambdas = (big_map[] : big_map(nat, tokenFunc));]'
node scripts/cli.js deploy -n Factory -p $npm_package_config_network 
sleep 3 
node scripts/cli.js deploy Token -p $npm_package_config_network
sleep 3 
node scripts/cli.js deploy Token Token2 -p $npm_package_config_network 
sleep 3