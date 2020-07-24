node scripts/cli.js compile_storage -i contractsV2 Factory 'record   storage = record      tokenList = (set[] : set((address * nat)));      tokenToExchange = (big_map[] :big_map((address * nat), address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end' 
node scripts/cli.js deploy -n Factory -p $npm_package_config_network 
sleep 3 
node scripts/cli.js deploy Token Token FA2 -p $npm_package_config_network 
sleep 3 
node scripts/cli.js deploy Token Token2 FA2 -p $npm_package_config_network 
sleep 3