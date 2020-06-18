echo "build"
node scripts/cli2.js build -i contractsV2 InitializeExchange
node scripts/cli2.js build -i contractsV2 InvestLiquidity
node scripts/cli2.js build -i contractsV2 DivestLiquidity
node scripts/cli2.js build -i contractsV2 TezToTokenSwap
node scripts/cli2.js build -i contractsV2 TokenToTokenSwap
node scripts/cli2.js build -i contractsV2 TokenToTezSwap
node scripts/cli2.js build -i contractsV2 TezToTokenPayment
node scripts/cli2.js build -i contractsV2 TokenToTezPayment
node scripts/cli2.js build -i contractsV2 SetVotesDelegation
node scripts/cli2.js build -i contractsV2 Factory
node scripts/cli2.js build -i contractsV2 Vote
node scripts/cli2.js build -i contractsV2 Veto
node scripts/cli2.js build -i contractsV2 ReceiveReward
node scripts/cli2.js build -i contractsV2 Dex

echo "deploy"
node scripts/cli2.js deploy InitializeExchange
sleep 1
node scripts/cli2.js deploy InvestLiquidity
sleep 1
node scripts/cli2.js deploy DivestLiquidity
sleep 1
node scripts/cli2.js deploy TezToTokenSwap
sleep 1
node scripts/cli2.js deploy TezToTokenPayment
sleep 1
node scripts/cli2.js deploy TokenToTezSwap
sleep 1
node scripts/cli2.js deploy TokenToTezPayment
sleep 1
node scripts/cli2.js deploy TokenToTokenSwap
sleep 1
node scripts/cli2.js deploy SetVotesDelegation
sleep 1
node scripts/cli2.js deploy Veto
sleep 1
node scripts/cli2.js deploy Vote
sleep 1
node scripts/cli2.js deploy ReceiveReward
sleep 1
node scripts/cli2.js deploy Factory
sleep 1
node scripts/cli2.js deploy Token
sleep 1
node scripts/cli2.js deploy Dex
sleep 1

# echo "deploy"
# node scripts/cli2.js deploy InitializeExchange InitializeExchange2
# sleep 5
# node scripts/cli2.js deploy InvestLiquidity InvestLiquidity2
# sleep 5
# node scripts/cli2.js deploy DivestLiquidity DivestLiquidity2
# sleep 5
# node scripts/cli2.js deploy TezToTokenSwap TezToTokenSwap2
# sleep 5
# node scripts/cli2.js deploy TezToTokenPayment TezToTokenPayment2
# sleep 5
# node scripts/cli2.js deploy TokenToTezSwap TokenToTezSwap2
# sleep 5
# node scripts/cli2.js deploy TokenToTezPayment TokenToTezPayment2
# sleep 5
# node scripts/cli2.js deploy TokenToTokenSwap TokenToTokenSwap2
# sleep 5
# node scripts/cli2.js deploy SetVotesDelegation SetVotesDelegation2
# sleep 5
# node scripts/cli2.js deploy Veto Veto2
# sleep 5
# node scripts/cli2.js deploy Vote Vote2
# sleep 5
# node scripts/cli2.js deploy Token Token2
# sleep 5
# node scripts/cli2.js deploy Dex Dex2 Dex2
# sleep 5

echo "test"
./node_modules/mocha/bin/mocha
