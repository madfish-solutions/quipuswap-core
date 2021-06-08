import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;
import { Parser } from "@taquito/michel-codec";

export const michelParser = new Parser();

contract.only("BuyTokenWithRoute()", function () {
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
    if (standard != "MIXED" && tokenAAddress > tokenBAddress) {
      const tmp = context.tokens[0];
      context.tokens[0] = context.tokens[1];
      context.tokens[1] = tmp;
      tokenAAddress = context.tokens[0].contract.address;
      tokenBAddress = context.tokens[1].contract.address;
    }
    await context.createPair({
      tokenAAmount: tokenCAmount,
      tokenBAddress,
      tokenBAmount: tokenBAmount,
    });
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
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[2].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[2].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
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
            operation: { buy: null },
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
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[2].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[2].storage.ledger[
        pairAddress
      ].balance;
      console.log(
        aliceInitTokenBBalance.toNumber(),
        amountIn,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - amountIn,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenABalance.toNumber() + amountOut + tokensLeftover,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        pairInitTokenABalance.toNumber() - amountOut - tokensLeftover,
        pairTokenABalance.toNumber()
      );
      strictEqual(
        pairInitTokenBBalance.toNumber() + amountIn,
        pairTokenBBalance.toNumber()
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() - amountOut - tokensLeftover
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() + amountIn
      );
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
              operation: { buy: null },
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
          console.log(err.message);
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
      1000,
      1000,
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
      1,
      1,
      0
    );
    // tokenToTokenSuccessCase(
    //   "success in case of ~30% of reserves to be swapped",
    //   300,
    //   22983,
    //   0
    // );
  });

  // describe("Test different minimal desirable output amount", () => {
  //   tokenToTokenFailCase(
  //     "reevert in case of 0 tokens expected",
  //     10,
  //     0,
  //     "Dex/zero-min-amount-out"
  //   );
  //   tokenToTokenFailCase(
  //     "revert in case of too many tokens expected",
  //     10,
  //     70000,
  //     "Dex/wrong-min-out"
  //   );
  //   tokenToTokenSuccessCase(
  //     "success in case of exact amount of tokens expected",
  //     5,
  //     293,
  //     0
  //   );
  //   tokenToTokenSuccessCase(
  //     "success in case of smaller amount of tokens expected",
  //     10,
  //     500,
  //     80
  //   );
  // });
});
