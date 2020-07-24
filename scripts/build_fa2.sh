node scripts/cli.js build Dex --no-json -o contractsV2 -i contractsV2
node scripts/cli.js build Factory -i contractsV2
cp misc/FA2.json build/Token.json