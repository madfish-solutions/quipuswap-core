const { MichelsonMap } = require('@taquito/michelson-encoder');
const fs = require("fs");

const { address: tokenAddress } = JSON.parse(
    fs.readFileSync("./deploy/Token.json").toString()
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
    voters: MichelsonMap.fromLiteral({}),
    vetos: MichelsonMap.fromLiteral({}),
    veto_voters: MichelsonMap.fromLiteral({}),
    votes: MichelsonMap.fromLiteral({}),
    veto: "0",
    delegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5",
    next_delegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5"
}