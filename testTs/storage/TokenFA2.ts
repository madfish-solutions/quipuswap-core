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
      symbol: "QSFA2",
      name: "QuipuT",
      decimals: 0,
      extras: new MichelsonMap(),
    },
  }),
  total_supply: "10000000",
};
