const { MichelsonMap } = require("@taquito/michelson-encoder");
const { alice } = require("../scripts/sandbox/accounts");

let totalSupply = "10000000";

module.exports = {
  owner: alice.pkh,
  totalSupply: totalSupply,
  ledger: MichelsonMap.fromLiteral({
    [alice.pkh]: {
      balance: totalSupply,
      allowances: MichelsonMap.fromLiteral({}),
    },
  }),
};
