module.exports.dexFunctions = [
  {
    index: 0,
    name: "initialize_exchange",
  },
  {
    index: 1,
    name: "tez_to_token",
  },
  {
    index: 2,
    name: "token_to_tez",
  },
  {
    index: 3,
    name: "withdraw_profit",
  },
  {
    index: 4,
    name: "invest_liquidity",
  },
  {
    index: 5,
    name: "divest_liquidity",
  },
  {
    index: 6,
    name: "vote",
  },
  {
    index: 7,
    name: "veto",
  },
  {
    index: 8,
    name: "receive_reward",
  },
];

let tokenFunctionsFA12 = [
  {
    index: 0,
    name: "transfer",
  },
  {
    index: 1,
    name: "approve",
  },
  {
    index: 2,
    name: "get_balance",
  },
  {
    index: 3,
    name: "get_allowance_to_contract",
  },
  {
    index: 4,
    name: "get_total_supply",
  },
];

let tokenFunctionsFA2 = [
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
  FA12: tokenFunctionsFA12,
  FA2: tokenFunctionsFA2,
};
