const { MichelsonMap } = require('@taquito/michelson-encoder');

module.exports = {
    tokenList: [],
    tokenToExchange: MichelsonMap.fromLiteral({}),
    exchangeToToken: MichelsonMap.fromLiteral({})
}
