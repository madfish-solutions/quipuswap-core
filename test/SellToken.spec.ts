import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
import { isConstructorDeclaration } from "typescript";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract("SellToken()", function () {
  let context: Context;
  const tokenAAmount: number = 100000;
  const tokenBAmount: number = 1000;
  const aliceAddress: string = accounts.alice.pkh;
  let tokenAAddress;
  let tokenBAddress;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
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
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
      await context.dex.tokenToTokenPayment(
        tokenAAddress,
        tokenBAddress,
        "sell",
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
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      strictEqual(
        aliceInitTokenBBalance.toNumber() + amountOut + tokensLeftover,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenABalance.toNumber() - amountIn,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        pairInitTokenABalance.toNumber() + amountIn,
        pairTokenABalance.toNumber()
      );
      strictEqual(
        pairInitTokenBBalance.toNumber() - amountOut - tokensLeftover,
        pairTokenBBalance.toNumber()
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() + amountIn
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() - amountOut - tokensLeftover
      );
    });
  }

  function tokenToTokenFailCase(decription, amountIn, amountOut, errorMsg) {
    it(decription, async function () {
      await rejects(
        context.dex.tokenToTokenPayment(
          tokenAAddress,
          tokenBAddress,
          "sell",
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
      100000,
      300,
      "Dex/high-out"
    );
    tokenToTokenFailCase(
      "revert in case of 1% of reserves to be swapped",
      1,
      1,
      "Dex/wrong-min-out"
    );
    tokenToTokenSuccessCase(
      "success in case of ~30% of reserves to be swapped",
      30000,
      230,
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
      1000,
      7,
      "Dex/wrong-min-out"
    );
    tokenToTokenSuccessCase(
      "success in case of exact amount of tokens expected",
      1000,
      5,
      0
    );
    tokenToTokenSuccessCase(
      "success in case of smaller amount of tokens expected",
      1000,
      1,
      4
    );
  });
});
