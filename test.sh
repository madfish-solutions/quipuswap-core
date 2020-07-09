network="-p https://api.tez.ie/rpc/carthagenet"
echo "build"
npm run build

echo "deploy"
npm run deploy

echo "set functions"
npm run set-functions

echo "test"
npm run test
