echo "build"
node scripts/cli2.js build
echo "deploy factory"
node scripts/cli2.js deploy Factory
sleep 5
echo "deploy first pair"
node scripts/cli2.js deploy Token
sleep 5
node scripts/cli2.js deploy Dex
sleep 5
echo "deploy second pair"
node scripts/cli2.js deploy Token Token2
sleep 5
node scripts/cli2.js deploy Dex Dex2 Dex2
sleep 5
echo "test"
node tests/tests.js
echo "test2"
node tests/tests.js "./deploy/Token2.json" "./deploy/Dex2.json"
echo "exchange"
node scripts/tokenToToken.js