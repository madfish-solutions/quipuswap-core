const { MichelsonMap } = require('@taquito/michelson-encoder');
const fs = require("fs");

const { address: tokenAddress } = JSON.parse(
    fs.readFileSync("./deploy/Token2.json").toString()
);
const { address: factoryAddress } = JSON.parse(
    fs.readFileSync("./deploy/Factory.json").toString()
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
    candidates: MichelsonMap.fromLiteral({}),
    votes: MichelsonMap.fromLiteral({}),
    delegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5"
}
