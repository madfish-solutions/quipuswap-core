import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  ledger: MichelsonMap.fromLiteral({
    tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb: {
      balance: "10000000",
      allowances: [],
    },
  }),
  operators: new MichelsonMap(),
  token_metadata: MichelsonMap.fromLiteral({
    0: {
      token_id: 0,
      extras: MichelsonMap.fromLiteral({
        0: new Buffer(
          JSON.stringify({
            name: "Quipu Token",
            authors: ["Madfish.Solutions"],
            homepage: "https://quipuswap.com/",
          })
        ).toString("hex"),
      }),
    },
  }),
  metadata: MichelsonMap.fromLiteral({
    "": new Buffer("tezos-storage:here", "ascii").toString("hex"),
    here: new Buffer(
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
  total_supply: "10000000",
};
