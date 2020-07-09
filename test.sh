echo "build"
npm run build
cp misc/OptimizedFactory.json build/Factory.json

echo "deploy"
npm run deploy

echo "set functions"
npm run set-functions

echo "test"
npm test
