const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = {
  counter: "0",
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
