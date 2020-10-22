import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  tokenList: [],
  tokenToExchange: MichelsonMap.fromLiteral({}),
  dexLambdas: MichelsonMap.fromLiteral({}),
  tokenLambdas: MichelsonMap.fromLiteral({}),
};
