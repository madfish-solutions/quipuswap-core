const { MichelsonMap } = require('@taquito/michelson-encoder');
const fs = require("fs");

const { address: tokenAddress } = JSON.parse(
    fs.readFileSync("./deploy/Token.json").toString()
);
const { address: factoryAddress } = JSON.parse(
    fs.readFileSync("./deploy/Factory.json").toString()
);
const { address: initializeExchangeAddress } = JSON.parse(
    fs.readFileSync("./deploy/InitializeExchange.json").toString()
);

const { address: investLiquidityAddress } = JSON.parse(
    fs.readFileSync("./deploy/InvestLiquidity.json").toString()
);
const { address: divestLiquidityAddress } = JSON.parse(
    fs.readFileSync("./deploy/DivestLiquidity.json").toString()
);
const { address: tezToTokenSwapAddress } = JSON.parse(
    fs.readFileSync("./deploy/TezToTokenSwap.json").toString()
);
const { address: tezToTokenPaymentAddress } = JSON.parse(
    fs.readFileSync("./deploy/TezToTokenPayment.json").toString()
);
const { address: tokenToTezSwapAddress } = JSON.parse(
    fs.readFileSync("./deploy/TokenToTezSwap.json").toString()
);
const { address: tokenToTezPaymentAddress } = JSON.parse(
    fs.readFileSync("./deploy/TokenToTezPayment.json").toString()
);
const { address: tokenToTokenSwapAddress } = JSON.parse(
    fs.readFileSync("./deploy/TokenToTokenSwap.json").toString()
);
const { address: voteAddress } = JSON.parse(
    fs.readFileSync("./deploy/Vote.json").toString()
);
const { address: vetoAddress } = JSON.parse(
    fs.readFileSync("./deploy/Veto.json").toString()
);
const { address: setVotesDelegationAddress } = JSON.parse(
    fs.readFileSync("./deploy/SetVotesDelegation.json").toString()
);

module.exports = {
    feeRate: "500",
    tezPool: "0",
    tokenPool: "0",
    invariant: "0",
    totalShares: "0",
    tokenAddress: tokenAddress,
    factoryAddress: factoryAddress,
    shares: MichelsonMap.fromLiteral({}),
    voters: MichelsonMap.fromLiteral({}),
    vetos: [],
    vetoVoters: MichelsonMap.fromLiteral({}),
    votes: MichelsonMap.fromLiteral({}),
    veto: "0",
    delegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5",
    nextDelegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5",
    allowed: MichelsonMap.fromLiteral({
        [tezToTokenSwapAddress]: true,
        [tezToTokenPaymentAddress]: true,
        [initializeExchangeAddress]: true,
        [tokenToTezSwapAddress]: true,
        [tokenToTezPaymentAddress]: true,
        [divestLiquidityAddress]: true,
        [tokenToTokenSwapAddress]: true,
        [investLiquidityAddress]: true,
        [voteAddress]: true,
        [vetoAddress]: true,
        [setVotesDelegationAddress]: true
    })
}
