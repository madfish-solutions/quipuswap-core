import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";

contract.only("TokenBToTokenA()", function () {
  let context: TTContext;
  const tokenAAmount: number = 100;
  const tokenBAmount: number = 100;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  let tokenAAddress;
  let tokenBAddress;

  before(async () => {
    context = await TTContext.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
    if (tokenAAddress > tokenBAddress) {
      const tmp = context.tokens[0];
      context.tokens[0] = context.tokens[1];
      context.tokens[1] = tmp;
      tokenAAddress = context.tokens[0].contract.address;
      tokenBAddress = context.tokens[1].contract.address;
    }
  });

  function tokenAToTokenBSuccessCase(
    decription,
    tokenAAmount,
    tokenBAmount,
    tokensLeftover
  ) {
    it(decription, async function () {
      const pairAddress = context.dex.contract.address;
      await context.tokens[0].updateStorage({
        ledger: [bobAddress, aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [bobAddress, aliceAddress, pairAddress],
      });
      const aliceInitTezLedger = await context.tokens[1].storage.ledger[
        aliceAddress
      ];
      const aliceInitTezBalance = aliceInitTezLedger
        ? aliceInitTezLedger.balance
        : new BigNumber(0);
      const aliceInitTokenLedger = await context.tokens[0].storage.ledger[
        aliceAddress
      ];
      const aliceInitTokenBalance = aliceInitTokenLedger
        ? aliceInitTokenLedger.balance
        : new BigNumber(0);
      const bobInitTokenLedger = await context.tokens[0].storage.ledger[
        bobAddress
      ];
      const bobInitTokenBalance = bobInitTokenLedger
        ? bobInitTokenLedger.balance
        : new BigNumber(0);
      const prevPairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const prevPairTezBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      await context.dex.updateStorage({
        ledger: [[aliceAddress, bobAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const prevStorage = context.dex.storage;
      await context.dex.tokenToTokenPayment(
        tokenAAddress,
        tokenBAddress,
        "buy",
        tokenAAmount,
        tokenBAmount,
        bobAddress
      );
      await context.dex.updateStorage({
        ledger: [[aliceAddress, bobAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, bobAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, bobAddress, pairAddress],
      });
      const aliceFinalTezLedger = await context.tokens[1].storage.ledger[
        aliceAddress
      ];
      const aliceFinalTezBalance = aliceFinalTezLedger
        ? aliceFinalTezLedger.balance
        : new BigNumber(0);
      const aliceFinalTokenLedger = await context.tokens[0].storage.ledger[
        aliceAddress
      ];
      const aliceFinalTokenBalance = aliceFinalTokenLedger
        ? aliceFinalTokenLedger.balance
        : new BigNumber(0);
      const bobFinalTokenLedger = await context.tokens[0].storage.ledger[
        bobAddress
      ];
      const bobFinalTokenBalance = bobFinalTokenLedger
        ? bobFinalTokenLedger.balance
        : new BigNumber(0);
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await context.tokens[1].storage.ledger[pairAddress]
        .balance;
      strictEqual(
        bobInitTokenBalance.toNumber() + tokenBAmount + tokensLeftover,
        bobFinalTokenBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBalance.toNumber(),
        aliceFinalTokenBalance.toNumber()
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        prevPairTokenBalance.toNumber() - tokenBAmount - tokensLeftover
      );
      ok(
        aliceInitTezBalance.toNumber() - tokenAAmount ==
          aliceFinalTezBalance.toNumber()
      );
      strictEqual(
        pairTezBalance.toNumber(),
        prevPairTezBalance.toNumber() + tokenAAmount
      );
      await context.dex.updateStorage({
        ledger: [[aliceAddress, bobAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      strictEqual(
        context.dex.storage.pairs[0].token_a_pool.toNumber(),
        prevStorage.pairs[0].token_a_pool.toNumber() -
          tokenBAmount -
          tokensLeftover
      );
      strictEqual(
        context.dex.storage.pairs[0].token_b_pool.toNumber(),
        prevStorage.pairs[0].token_b_pool.toNumber() + tokenAAmount
      );
    });
  }

  function tokenAToTokenBFailCase(
    decription,
    tokenAAmount,
    tokenBAmount,
    errorMsg
  ) {
    it(decription, async function () {
      await rejects(
        context.dex.tokenToTokenPayment(
          tokenAAddress,
          tokenBAddress,
          "buy",
          tokenAAmount,
          tokenBAmount,
          bobAddress
        ),
        (err) => {
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        }
      );
    });
  }

  describe("Test different amount of tokens to be swapped", () => {
    tokenAToTokenBFailCase(
      "revert in case of 0 token a to be swapped",
      0,
      1,
      "Dex/zero-amount-in"
    );
    tokenAToTokenBFailCase(
      "revert in case of 100% of reserves to be swapped",
      100,
      1,
      "Dex/high-out"
    );
    tokenAToTokenBFailCase(
      "revert in case of 10000% of reserves to be swapped",
      10000,
      1,
      "Dex/high-out"
    );
    tokenAToTokenBFailCase(
      "revert in case of 1% of reserves to be swapped",
      1,
      1,
      "Dex/wrong-min-out"
    );
    tokenAToTokenBSuccessCase(
      "success in case of ~30% of reserves to be swapped",
      31,
      23,
      0
    );
  });

  describe("Test different minimal desirable output amount", () => {
    tokenAToTokenBFailCase(
      "reevert in case of 0 tokens expected",
      10,
      0,
      "Dex/zero-min-amount-out"
    );
    tokenAToTokenBFailCase(
      "revert in case of too many tokens expected",
      10,
      7,
      "Dex/wrong-min-out"
    );
    tokenAToTokenBSuccessCase(
      "success in case of exact amount of tokens expected",
      10,
      5,
      0
    );
    tokenAToTokenBSuccessCase(
      "success in case of smaller amount of tokens expected",
      10,
      3,
      1
    );
  });
});
