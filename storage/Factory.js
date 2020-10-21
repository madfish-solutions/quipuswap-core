const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = { tokenList:[],
  tokenToExchange:MichelsonMap.fromLiteral({}),
  dexLambdas:MichelsonMap.fromLiteral({}),
  tokenLambdas:MichelsonMap.fromLiteral({})}

