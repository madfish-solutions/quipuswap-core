import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  counter: "0",
  token_list: MichelsonMap.fromLiteral({}),
  token_to_exchange: MichelsonMap.fromLiteral({}),
  dex_lambdas: MichelsonMap.fromLiteral({}),
  token_lambdas: MichelsonMap.fromLiteral({}),
};
