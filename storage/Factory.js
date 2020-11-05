const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = {
  token_list: [],
  token_to_exchange: MichelsonMap.fromLiteral({}),
  dex_lambdas: MichelsonMap.fromLiteral({}),
  token_lambdas: MichelsonMap.fromLiteral({}),
};
