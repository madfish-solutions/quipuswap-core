export let dexFunctions = [
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
];

export let tokenFunctions = [
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
