const { MichelsonMap } = require('@taquito/michelson-encoder');

module.exports = {
    owner: "tz1bQEJqMqC92ommfsRB6pWG9LVBKNgXPysh",
    totalSupply: "10000000000",
    ledger: MichelsonMap.fromLiteral({
        "tz1bQEJqMqC92ommfsRB6pWG9LVBKNgXPysh": {
            balance: "10000000",
            allowances: MichelsonMap.fromLiteral({})
        }
    })
}