import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract("SellTokenWithRoute()", function () {
  let context: TTContext;
  const tokenAAmount: number = 100000;
  const tokenBAmount: number = 10000;
  const tokenCAmount: number = 10000;
  const aliceAddress: string = accounts.alice.pkh;
  let tokenAAddress;
  let tokenBAddress;
  let tokenCAddress;
  let reverseOrder;

  before(async () => {
    context = await TTContext.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
    await context.createPair(
      {
        tokenAAmount: tokenCAmount,
        tokenBAddress,
        tokenBAmount: tokenBAmount,
      },
      false
    );
    tokenCAddress = context.tokens[2].contract.address;
    reverseOrder = standard != "MIXED" && tokenCAddress > tokenBAddress;
  });

  function tokenToTokenSuccessCase(
    decription,
    amountIn,
    amountOut,
    tokensLeftover
  ) {
    it(decription, async function () {
      const pairAddress = context.dex.contract.address;
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[2].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0", "1"],
      });
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenСBalance = (
        (await context.tokens[2].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenСBalance = await context.tokens[2].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair0 = context.dex.storage.pairs[0];
      const initDexPair1 = context.dex.storage.pairs[1];
      await context.dex.tokenToTokenRoutePayment(
        [
          {
            pair: {
              token_a_address: tokenAAddress,
              token_b_address: tokenBAddress,
              token_a_id: new BigNumber(0),
              token_b_id: new BigNumber(0),
              standard: { [standard.toLowerCase()]: null },
            },
            operation: { sell: null },
          },
          {
            pair: {
              token_a_address: reverseOrder ? tokenBAddress : tokenCAddress,
              token_b_address: reverseOrder ? tokenCAddress : tokenBAddress,
              token_a_id: new BigNumber(0),
              token_b_id: new BigNumber(0),
              standard: { [standard.toLowerCase()]: null },
            },
            operation: { buy: null },
          },
        ],
        amountIn,
        amountOut,
        aliceAddress
      );
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[2].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0", "1"],
      });
      const finalDexPair0 = context.dex.storage.pairs[0];
      const finalDexPair1 = context.dex.storage.pairs[1];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenСBalance = await context.tokens[2].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenСBalance = await context.tokens[2].storage.ledger[
        pairAddress
      ].balance;
      const internalBalanceChange0 =
        initDexPair0.token_b_pool.toNumber() -
        finalDexPair0.token_b_pool.toNumber();
      const internalBalanceChange1 =
        finalDexPair1.token_b_pool.toNumber() -
        initDexPair1.token_b_pool.toNumber();
      strictEqual(
        aliceInitTokenBBalance.toNumber(),
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenABalance.toNumber() - amountIn,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenСBalance.toNumber() + amountOut + tokensLeftover,
        aliceFinalTokenСBalance.toNumber()
      );
      strictEqual(
        pairInitTokenBBalance.toNumber(),
        pairTokenBBalance.toNumber()
      );
      strictEqual(
        pairInitTokenСBalance.toNumber() - amountOut - tokensLeftover,
        pairTokenСBalance.toNumber()
      );
      strictEqual(
        pairInitTokenABalance.toNumber() + amountIn,
        pairTokenABalance.toNumber()
      );
      strictEqual(
        finalDexPair0.token_a_pool.toNumber(),
        initDexPair0.token_a_pool.toNumber() + amountIn
      );
      strictEqual(
        finalDexPair1.token_a_pool.toNumber(),
        initDexPair1.token_a_pool.toNumber() - amountOut - tokensLeftover
      );
      strictEqual(internalBalanceChange0, internalBalanceChange1);
    });
  }

  function tokenToTokenFailCase(decription, amountIn, amountOut, errorMsg) {
    it(decription, async function () {
      await rejects(
        context.dex.tokenToTokenRoutePayment(
          [
            {
              pair: {
                token_a_address: tokenAAddress,
                token_b_address: tokenBAddress,
                token_a_id: new BigNumber(0),
                token_b_id: new BigNumber(0),
                standard: { [standard.toLowerCase()]: null },
              },
              operation: { sell: null },
            },
            {
              pair: {
                token_a_address: reverseOrder ? tokenBAddress : tokenCAddress,
                token_b_address: reverseOrder ? tokenCAddress : tokenBAddress,
                token_a_id: new BigNumber(0),
                token_b_id: new BigNumber(0),
                standard: { [standard.toLowerCase()]: null },
              },
              operation: { buy: null },
            },
          ],
          amountIn,
          amountOut,
          aliceAddress
        ),
        (err) => {
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        }
      );
    });
  }

  describe("Test different amount of tokens to be swapped", () => {
    tokenToTokenFailCase(
      "revert in case of 0 tokens to be swapped",
      0,
      1,
      "Dex/zero-amount-in"
    );
    tokenToTokenFailCase(
      "revert in case of 100% of reserves to be swapped",
      100000,
      300,
      "Dex/high-out"
    );
    tokenToTokenFailCase(
      "revert in case of 10000% of reserves to be swapped",
      100000000,
      1,
      "Dex/high-out"
    );
    tokenToTokenFailCase(
      "revert in case of 1% of reserves to be swapped",
      12,
      1,
      "Dex/wrong-min-out"
    );
    tokenToTokenSuccessCase(
      "success in case of ~30% of reserves to be swapped",
      30000,
      1866,
      0
    );
  });

  describe("Test different minimal desirable output amount", () => {
    tokenToTokenFailCase(
      "reevert in case of 0 tokens expected",
      10,
      0,
      "Dex/zero-min-amount-out"
    );
    tokenToTokenFailCase(
      "revert in case of too many tokens expected",
      20,
      7,
      "Dex/wrong-min-out"
    );
    tokenToTokenSuccessCase(
      "success in case of exact amount of tokens expected",
      1000,
      38,
      0
    );
    tokenToTokenSuccessCase(
      "success in case of smaller amount of tokens expected",
      1000,
      33,
      4
    );
  });
});
