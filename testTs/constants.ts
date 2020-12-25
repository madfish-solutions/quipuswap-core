import BigNumber from "bignumber.js";

export const initialSharesCount = 1000;

export const defaultAccountInfo = {
  balance: new BigNumber(0),
  frozen_balance: new BigNumber(0),
  allowances: {},
};
