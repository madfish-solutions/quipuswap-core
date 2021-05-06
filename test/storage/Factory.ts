import { MichelsonMap } from "@taquito/michelson-encoder";

export default {
  counter: "0",
  baker_validator: "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg",
  token_list: MichelsonMap.fromLiteral({}),
  token_to_exchange: MichelsonMap.fromLiteral({}),
  dex_lambdas: MichelsonMap.fromLiteral({}),
  token_lambdas: MichelsonMap.fromLiteral({}),
  voters: MichelsonMap.fromLiteral({}),
  vetos: MichelsonMap.fromLiteral({}),
  votes: MichelsonMap.fromLiteral({}),
  user_rewards: MichelsonMap.fromLiteral({}),
  metadata: MichelsonMap.fromLiteral({}),
  ledger: MichelsonMap.fromLiteral({}),
};
