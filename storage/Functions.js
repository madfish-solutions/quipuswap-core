module.exports.dexFunctions = [
  {
    index: 0,
    name: "initialize_exchange",
  },
  {
    index: 1,
    name: "token_to_token_route",
  },
  {
    index: 2,
    name: "invest_liquidity",
  },
  {
    index: 3,
    name: "divest_liquidity",
  },
  {
    index: 4,
    name: "ensured_initialize_exchange",
  },
  {
    index: 5,
    name: "ensured_route",
  },
  {
    index: 6,
    name: "ensured_invest",
  },
];

module.exports.balFunctions = [
  {
    index: 0,
    name: "update_balance_fa_12_a",
  },
  {
    index: 1,
    name: "update_balance_fa_12_b",
  },
  {
    index: 2,
    name: "update_balance_fa_2_a",
  },
  {
    index: 3,
    name: "update_balance_fa_2_b",
  },
];

let tokenFunctions = [
  {
    index: 0,
    name: "transfer",
  },
  {
    index: 1,
    name: "update_operators",
  },
  {
    index: 2,
    name: "get_balance_of",
  },
];
module.exports.tokenFunctions = {
  FA12: tokenFunctions,
  MIXED: tokenFunctions,
  FA2: tokenFunctions,
};
