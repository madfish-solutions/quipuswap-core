import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;
import { Parser } from "@taquito/michel-codec";

export const michelParser = new Parser();

contract("BuyTokenWithRoute()", function () {
  let context: Context;
  const tokenAAmount: number = 100000;
  const tokenBAmount: number = 10000;
  const tokenCAmount: number = 10000;
  const aliceAddress: string = accounts.alice.pkh;
  let tokenAAddress;
  let tokenBAddress;
  let tokenCAddress;
  let reverseOrder;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
    await context.createPair(
      {
        tokenAAmount: tokenAAmount,
        tokenAAddress,
        tokenBAmount: tokenCAmount,
      },
      false
    );
    tokenCAddress = context.tokens[2].contract.address;
    reverseOrder = standard != "MIXED" && tokenAAddress > tokenCAddress;
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
              token_a_type: {
                [standard.toLowerCase() == "mixed"
                  ? "fa2"
                  : standard.toLowerCase()]: null,
              },
              token_b_type: {
                [standard.toLowerCase() == "mixed"
                  ? "fa12"
                  : standard.toLowerCase()]: null,
              },
            },
            operation: { buy: null },
          },
          {
            pair: {
              token_a_address: reverseOrder ? tokenCAddress : tokenAAddress,
              token_b_address: reverseOrder ? tokenAAddress : tokenCAddress,
              token_a_id: new BigNumber(0),
              token_b_id: new BigNumber(0),
              token_a_type: {
                [standard.toLowerCase() == "mixed"
                  ? "fa2"
                  : standard.toLowerCase()]: null,
              },
              token_b_type: {
                [standard.toLowerCase() == "mixed"
                  ? "fa12"
                  : standard.toLowerCase()]: null,
              },
            },
            operation: { sell: null },
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
        initDexPair0.token_a_pool.toNumber() -
        finalDexPair0.token_a_pool.toNumber();
      const internalBalanceChange1 =
        finalDexPair1.token_a_pool.toNumber() -
        initDexPair1.token_a_pool.toNumber();
      strictEqual(
        aliceInitTokenABalance.toNumber(),
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - amountIn,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenСBalance.toNumber() + amountOut + tokensLeftover,
        aliceFinalTokenСBalance.toNumber()
      );
      strictEqual(
        pairInitTokenABalance.toNumber(),
        pairTokenABalance.toNumber()
      );
      strictEqual(
        pairInitTokenСBalance.toNumber() - amountOut - tokensLeftover,
        pairTokenСBalance.toNumber()
      );
      strictEqual(
        pairInitTokenBBalance.toNumber() + amountIn,
        pairTokenBBalance.toNumber()
      );
      strictEqual(
        finalDexPair0.token_b_pool.toNumber(),
        initDexPair0.token_b_pool.toNumber() + amountIn
      );
      strictEqual(
        finalDexPair1.token_b_pool.toNumber(),
        initDexPair1.token_b_pool.toNumber() - amountOut - tokensLeftover
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
                token_a_type: {
                  [standard.toLowerCase() == "mixed"
                    ? "fa2"
                    : standard.toLowerCase()]: null,
                },
                token_b_type: {
                  [standard.toLowerCase() == "mixed"
                    ? "fa12"
                    : standard.toLowerCase()]: null,
                },
              },
              operation: { buy: null },
            },
            {
              pair: {
                token_a_address: reverseOrder ? tokenCAddress : tokenAAddress,
                token_b_address: reverseOrder ? tokenAAddress : tokenCAddress,
                token_a_id: new BigNumber(0),
                token_b_id: new BigNumber(0),
                token_a_type: {
                  [standard.toLowerCase() == "mixed"
                    ? "fa2"
                    : standard.toLowerCase()]: null,
                },
                token_b_type: {
                  [standard.toLowerCase() == "mixed"
                    ? "fa12"
                    : standard.toLowerCase()]: null,
                },
              },
              operation: { sell: null },
            },
          ],
          amountIn,
          amountOut,
          aliceAddress
        ),
        (err: any) => {
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
      10000,
      1,
      "Dex/high-out"
    );
    tokenToTokenFailCase(
      "revert in case of 10000% of reserves to be swapped",
      100000,
      1,
      "Dex/high-out"
    );

    tokenToTokenSuccessCase(
      "success in case of 1% of reserves to be swapped",
      11,
      10,
      0
    );
    tokenToTokenSuccessCase(
      "success in case of ~30% of reserves to be swapped",
      300,
      280,
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
      10,
      70000,
      "Dex/wrong-min-out"
    );
    tokenToTokenSuccessCase(
      "success in case of exact amount of tokens expected",
      5,
      4,
      0
    );
    tokenToTokenSuccessCase(
      "success in case of smaller amount of tokens expected",
      10,
      7,
      1
    );
  });
});
