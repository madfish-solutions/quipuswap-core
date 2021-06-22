import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

if (standard !== "MIXED") {
  contract("TezToTokenPayment()", function () {
    let context: Context;
    let tokenAddress: string;
    let pairAddress: string;
    const aliceAddress: string = accounts.alice.pkh;
    const bobAddress: string = accounts.bob.pkh;

    before(async () => {
      context = await Context.init([], false, "alice", false);
      await context.setDexFactoryFunction(0, "initialize_exchange");
      await context.setDexFactoryFunction(1, "tez_to_token");
      await context.setDexFactoryFunction(4, "invest_liquidity");
      await context.setDexFactoryFunction(5, "divest_liquidity");
      pairAddress = await context.createPair({
        tezAmount: 100,
        tokenAmount: 100,
      });
      tokenAddress = await context.pairs[0].contract.address;
    });

    function tezToTokenSuccessCase(
      decription,
      xtzAmount,
      tokensAmount,
      tokensLeftover
    ) {
      it(decription, async function () {
        const pairAddress = context.pairs[0].contract.address;
        await context.tokens[0].updateStorage({
          ledger: [bobAddress, aliceAddress, pairAddress],
        });
        const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
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
        const prevPairTezBalance = await tezos.tz.getBalance(pairAddress);
        await context.pairs[0].updateStorage();
        const prevStorage = context.pairs[0].storage;
        await context.tokens[0].updateStorage({
          ledger: [bobAddress, aliceAddress],
        });
        await context.pairs[0].tezToTokenPayment(
          tokensAmount,
          xtzAmount,
          bobAddress
        );
        const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
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
          bobInitTokenBalance.toNumber() + tokensAmount + tokensLeftover,
          bobFinalTokenBalance.toNumber()
        );
        strictEqual(
          aliceInitTokenBalance.toNumber(),
          aliceFinalTokenBalance.toNumber()
        );
        strictEqual(
          pairTokenBalance.toNumber(),
          prevPairTokenBalance.toNumber() - tokensAmount - tokensLeftover
        );
        ok(
          aliceInitTezBalance.toNumber() + xtzAmount >=
            aliceFinalTezBalance.toNumber()
        );
        strictEqual(
          pairTezBalance.toNumber(),
          prevPairTezBalance.toNumber() + xtzAmount
        );
        await context.pairs[0].updateStorage();
        strictEqual(
          context.pairs[0].storage.tez_pool.toNumber(),
          prevStorage.tez_pool.toNumber() + xtzAmount
        );
        strictEqual(
          context.pairs[0].storage.token_pool.toNumber(),
          prevStorage.token_pool.toNumber() - tokensAmount - tokensLeftover
        );
      });
    }

    function tezToTokenFailCase(decription, xtzAmount, tokensAmount, errorMsg) {
      it(decription, async function () {
        await rejects(
          context.pairs[0].tezToTokenPayment(
            tokensAmount,
            xtzAmount,
            bobAddress
          ),
          (err) => {
            ok(err.message == errorMsg, "Error message mismatch");
            return true;
          }
        );
      });
    }

    describe("Test different amount of XTZ to be swapped", () => {
      tezToTokenFailCase(
        "revert in case of 0 XTZ to be swapped",
        0,
        1,
        "Dex/zero-amount-in"
      );
      tezToTokenFailCase(
        "revert in case of 100% of reserves to be swapped",
        100,
        1,
        "Dex/high-out"
      );
      tezToTokenFailCase(
        "revert in case of 10000% of reserves to be swapped",
        10000,
        1,
        "Dex/high-out"
      );
      tezToTokenFailCase(
        "revert in case of 1% of reserves to be swapped",
        1,
        1,
        "Dex/wrong-min-out"
      );
      tezToTokenSuccessCase(
        "success in case of ~30% of reserves to be swapped",
        31,
        23,
        0
      );
    });

    describe("Test different minimal desirable output amount", () => {
      tezToTokenFailCase(
        "reevert in case of 0 tokens expected",
        10,
        0,
        "Dex/zero-min-amount-out"
      );
      tezToTokenFailCase(
        "revert in case of too many tokens expected",
        10,
        7,
        "Dex/wrong-min-out"
      );
      tezToTokenSuccessCase(
        "success in case of exact amount of tokens expected",
        10,
        5,
        0
      );
      tezToTokenSuccessCase(
        "success in case of smaller amount of tokens expected",
        10,
        3,
        1
      );
    });
  });
}
