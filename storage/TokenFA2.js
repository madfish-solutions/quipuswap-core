const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../scripts/sandbox/accounts");

let totalSupply = "10000000";
module.exports = {
  ledger: MichelsonMap.fromLiteral({
    [alice.pkh]: { balance: totalSupply, allowances: [] },
  }),
  operators: new MichelsonMap(),
  token_metadata: MichelsonMap.fromLiteral({
    0: {
      token_id: 0,
      symbol: "QSFA2",
      name: "QuipuT",
      decimals: 0,
      extras: new MichelsonMap(),
    },
  }),
  total_supply: totalSupply,
};
