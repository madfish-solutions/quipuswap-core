import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  owner: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
  totalSupply: "10000000",
  ledger: MichelsonMap.fromLiteral({
    tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb: {
      balance: "10000000",
      allowances: MichelsonMap.fromLiteral({}),
    },
  }),
};
