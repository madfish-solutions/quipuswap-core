import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  token_list: [],
  token_to_exchange: MichelsonMap.fromLiteral({}),
  dex_lambdas: MichelsonMap.fromLiteral({}),
  token_lambdas: MichelsonMap.fromLiteral({}),
};
