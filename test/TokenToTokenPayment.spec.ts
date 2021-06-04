import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

if (standard !== "FA2FA12") {
  contract("TokenToTokenPayment()", function () {
    let context: Context;
    let tokenAddress: string;
    const tezInitAmount0 = 10000;
    const tezInitAmount1 = 20000;
    const tokenInitAmount0 = 1000000;
    const tokenInitAmount1 = 10000;

    before(async () => {
      context = await Context.init([], false, "alice", false);
      await context.setDexFactoryFunction(0, "initialize_exchange");
      await context.setDexFactoryFunction(1, "tez_to_token");
      await context.setDexFactoryFunction(2, "token_to_tez");
      await context.setDexFactoryFunction(4, "invest_liquidity");
      await context.setDexFactoryFunction(5, "divest_liquidity");
      await context.createPairs([
        { tezAmount: tezInitAmount0, tokenAmount: tokenInitAmount0 },
        { tezAmount: tezInitAmount1, tokenAmount: tokenInitAmount1 },
      ]);
      tokenAddress = await context.pairs[0].contract.address;
    });

    it("should exchnge token to token and update dex state", async function () {
      this.timeout(5000000);
      let tokenAmount = 1000;
      let middleTezAmount = 9;
      let minTokensOut = 4;

      let firstDexContract = context.pairs[0].contract;
      let secondDexContract = context.pairs[1].contract;
      let aliceAddress = await tezos.signer.publicKeyHash();

      // update keys
      await context.updateActor("carol");
      let carolAddress = await tezos.signer.publicKeyHash();
      await context.updateActor("bob");
      let bobAddress = await tezos.signer.publicKeyHash();
      await context.updateActor();

      // send tokens to bob
      await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);
      await context.updateActor("bob");

      // check initial balance
      let bobInitTezBalance = await tezos.tz.getBalance(bobAddress);
      await context.tokens[0].updateStorage({ ledger: [bobAddress] });
      await context.tokens[1].updateStorage({
        ledger: [bobAddress, carolAddress],
      });
      let bobInitFirstTokenLedger = await context.tokens[0].storage.ledger[
        bobAddress
      ];
      let bobInitSecondTokenLedger = await context.tokens[1].storage.ledger[
        bobAddress
      ];
      let bobInitFirstTokenBalance = bobInitFirstTokenLedger
        ? bobInitFirstTokenLedger.balance
        : new BigNumber(0);
      let bobInitSecondTokenBalance = bobInitSecondTokenLedger
        ? bobInitSecondTokenLedger.balance
        : new BigNumber(0);
      let carolInitSecondTokenLedger = await context.tokens[1].storage.ledger[
        carolAddress
      ];
      let carolInitSecondTokenBalance = carolInitSecondTokenLedger
        ? carolInitSecondTokenLedger.balance
        : new BigNumber(0);

      // swap tokens liquidity
      await context.pairs[0].tokenToTokenPayment(
        tokenAmount,
        minTokensOut,
        secondDexContract,
        middleTezAmount,
        carolAddress
      );

      // checks
      let bobFinalTezBalance = await tezos.tz.getBalance(bobAddress);
      await context.tokens[0].updateStorage({
        ledger: [bobAddress, firstDexContract.address],
      });
      await context.tokens[1].updateStorage({
        ledger: [bobAddress, carolAddress, secondDexContract.address],
      });
      let bobFinalFirstTokenBalance = await context.tokens[0].storage.ledger[
        bobAddress
      ].balance;
      let bobFinalSecondTokenLedger = await context.tokens[1].storage.ledger[
        bobAddress
      ];
      let bobFinalSecondTokenBalance = bobFinalSecondTokenLedger
        ? bobFinalSecondTokenLedger.balance
        : new BigNumber(0);

      let carolFinalSecondTokenBalance = await context.tokens[1].storage.ledger[
        carolAddress
      ].balance;

      let firstPairTokenBalance = await context.tokens[0].storage.ledger[
        firstDexContract.address
      ].balance;
      let firstPairTezBalance = await tezos.tz.getBalance(
        firstDexContract.address
      );
      let secondPairTokenBalance = await context.tokens[1].storage.ledger[
        secondDexContract.address
      ].balance;
      let secondPairTezBalance = await tezos.tz.getBalance(
        secondDexContract.address
      );

      // 1. check tez balances
      ok(bobInitTezBalance.toNumber() > bobFinalTezBalance.toNumber());
      strictEqual(
        firstPairTezBalance.toNumber(),
        tezInitAmount0 - middleTezAmount
      );
      strictEqual(
        secondPairTezBalance.toNumber(),
        tezInitAmount1 + middleTezAmount
      );

      // 2. check tokens balances
      strictEqual(
        bobInitFirstTokenBalance.toNumber() - tokenAmount,
        bobFinalFirstTokenBalance.toNumber()
      );
      strictEqual(
        bobInitSecondTokenBalance.toNumber(),
        bobFinalSecondTokenBalance.toNumber()
      );
      strictEqual(
        carolInitSecondTokenBalance.toNumber() + minTokensOut,
        carolFinalSecondTokenBalance.toNumber()
      );
      strictEqual(
        firstPairTokenBalance.toNumber(),
        tokenInitAmount0 + tokenAmount
      );
      strictEqual(
        secondPairTokenBalance.toNumber(),
        tokenInitAmount1 - minTokensOut
      );

      // 3. new pairs state
      await context.pairs[0].updateStorage();
      await context.pairs[1].updateStorage();
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        tezInitAmount0 - middleTezAmount
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        tokenInitAmount0 + tokenAmount
      );
      strictEqual(
        context.pairs[1].storage.tez_pool.toNumber(),
        tezInitAmount1 + middleTezAmount
      );
      strictEqual(
        context.pairs[1].storage.token_pool.toNumber(),
        tezInitAmount0 - minTokensOut
      );
    });
  });
}
