node scripts/cli.js compile_storage Factory 'record   storage = record      tokenList = (set[] : set(address));      tokenToExchange = (big_map[] :big_map(address, address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end'
node scripts/cli.js deploy -n Factory -p $npm_package_config_network 
sleep 3 
node scripts/cli.js deploy Token -p $npm_package_config_network
sleep 3 
node scripts/cli.js deploy Token Token2 -p $npm_package_config_network 
sleep 3