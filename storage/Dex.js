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
    vetos: MichelsonMap.fromLiteral({}),
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
        [investLiquidityAddress]: true
    })
}
