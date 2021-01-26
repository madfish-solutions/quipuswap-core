const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../scripts/sandbox/accounts");

module.exports = {
  owners: [alice.pkh],
  metadata: MichelsonMap.fromLiteral({
    "": Buffer("tezos-storage:here", "ascii").toString("hex"),
    here: Buffer(
      JSON.stringify({
        version: "v0.0.1",
        description: "Quipuswap Share Pool Token",
        name: "Quipu Token",
        authors: ["Madfish.Solutions"],
        homepage: "https://quipuswap.com/",
        source: {
          tools: ["Ligo", "Flextesa"],
          location: "https://ligolang.org/",
        },
        interfaces: ["TZIP-12", "TZIP-16"],
        errors: [],
        views: [],
        tokens: {
          dynamic: [
            {
              big_map: "token_metadata",
            },
          ],
        },
      }),
      "ascii"
    ).toString("hex"),
  }),
};
