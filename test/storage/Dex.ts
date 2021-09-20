import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  storage: {
    pairs_count: "0",
    tmp: {
      balance_a: null,
      balance_b: null,
    },
    tokens: MichelsonMap.fromLiteral({}),
    token_to_id: MichelsonMap.fromLiteral({}),
    pairs: MichelsonMap.fromLiteral({}),
    ledger: MichelsonMap.fromLiteral({}),
  },
  metadata: MichelsonMap.fromLiteral({}),
  dex_lambdas: MichelsonMap.fromLiteral({}),
  balance_lambdas: MichelsonMap.fromLiteral({}),
  token_lambdas: MichelsonMap.fromLiteral({}),
};
