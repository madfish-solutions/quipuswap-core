const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../scripts/sandbox/accounts");

module.exports = {
  owners: [alice.pkh],
  metadata: MichelsonMap.fromLiteral({
    "": Buffer("tezos-storage:here", "ascii").toString("hex"),
    here: Buffer(
      JSON.stringify({
        token_id: 0,
        symbol: "QPS",
        name: "QuipuSwap Pool Share",
        decimals: 3,
      }),
      "ascii"
    ).toString("hex"),
  }),
};
