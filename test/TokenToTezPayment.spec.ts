import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";

contract("TokenToTezPayment()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(2, "token_to_tez");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    pairAddress = await context.createPair({
      tezAmount: 100,
      tokenAmount: 100,
    });
    tokenAddress = await context.pairs[0].contract.address;
  });

  function tokenToTezSuccessCase(
    decription,
    xtzAmount,
    tokensAmount,
    tezLeftover
  ) {
    it(decription, async function () {
      const pairAddress = context.pairs[0].contract.address;
      await context.tokens[0].updateStorage({
        ledger: [bobAddress, aliceAddress, pairAddress],
      });
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const bobInitTezBalance = await tezos.tz.getBalance(bobAddress);
      const aliceInitTokenLedger = await context.tokens[0].storage.ledger[
        aliceAddress
      ];
      const aliceInitTokenBalance = aliceInitTokenLedger
        ? aliceInitTokenLedger.balance
        : new BigNumber(0);
      const prevPairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const prevPairTezBalance = await tezos.tz.getBalance(pairAddress);
      await context.pairs[0].updateStorage();
      const prevStorage = context.pairs[0].storage;
      await context.tokens[0].updateStorage({
        ledger: [bobAddress, aliceAddress],
      });
      await context.pairs[0].tokenToTezPayment(
        tokensAmount,
        xtzAmount,
        bobAddress
      );
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      const bobFinalTezBalance = await tezos.tz.getBalance(bobAddress);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, bobAddress, pairAddress],
      });
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
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);
      strictEqual(
        bobInitTezBalance.toNumber() + xtzAmount,
        bobFinalTezBalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBalance.toNumber() - tokensAmount,
        aliceFinalTokenBalance.toNumber()
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        prevPairTokenBalance.toNumber() + tokensAmount
      );
      ok(aliceInitTezBalance.toNumber() > aliceFinalTezBalance.toNumber());
      strictEqual(
        pairTezBalance.toNumber(),
        prevPairTezBalance.toNumber() - xtzAmount - tezLeftover
      );
      await context.pairs[0].updateStorage();
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        prevStorage.tez_pool.toNumber() - xtzAmount - tezLeftover
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        prevStorage.token_pool.toNumber() + tokensAmount
      );
    });
  }

  function tokenToTezFailCase(decription, xtzAmount, tokensAmount, errorMsg) {
    it(decription, async function () {
      await rejects(
        context.pairs[0].tokenToTezPayment(tokensAmount, xtzAmount, bobAddress),
        (err) => {
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        }
      );
    });
  }

  describe("Test different amount of tokens to be swapped", () => {
    tokenToTezFailCase(
      "revert in case of 0 tokens to be swapped",
      1,
      0,
      "Dex/zero-amount-in"
    );
    tokenToTezFailCase(
      "revert in case of 100% of reserves to be swapped",
      1,
      100,
      "Dex/high-out"
    );

    tokenToTezFailCase(
      "revert in case of 10000% of reserves to be swapped",
      1,
      10000,
      "Dex/high-out"
    );

    tokenToTezFailCase(
      "revert in case of 1% of reserves to be swapped",
      1,
      1,
      "Dex/wrong-min-out"
    );

    tokenToTezSuccessCase(
      "success in case of ~30% of reserves to be swapped",
      23,
      31,
      0
    );
  });

  describe("Test different minimal desirable output amount", () => {
    tokenToTezFailCase(
      "reevert in case of 0 XTZ expected",
      0,
      10,
      "Dex/zero-min-amount-out"
    );
    tokenToTezFailCase(
      "revert in case of too many XTZ expected",
      10,
      10,
      "Dex/wrong-min-out"
    );
    tokenToTezSuccessCase(
      "success in case of exact amount of XTZ expected",
      5,
      11,
      0
    );
    tokenToTezSuccessCase(
      "success in case of smaller amount of XTZ expected",
      4,
      10,
      0
    );
  });
});
