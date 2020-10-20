import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { TezosOperationError } from "@taquito/taquito";
import { calculateFee } from "./contracManagers/utils";

describe("TokenToTokenPayment()", function () {
  it.only("should exchnge token to token and update dex state", async function () {
    this.timeout(5000000);
    // create context with exchange
    let context = await Context.init([
      { tezAmount: 10000, tokenAmount: 1000000 },
      { tezAmount: 20000, tokenAmount: 10000 },
    ]);

    let tokenAmount = 1000;
    let middleTezAmount = 10;
    let minTokensOut = 5;

    let firstDexContract = context.pairs[0].contract;
    let secondDexContract = context.pairs[1].contract;
    let aliceAddress = await context.tezos.signer.publicKeyHash();

    // update keys
    await context.updateActor("../../fixtures/key2");
    let carolAddress = await context.tezos.signer.publicKeyHash();
    await context.updateActor("../../fixtures/key1");
    let bobAddress = await context.tezos.signer.publicKeyHash();
    await context.updateActor();

    // send tokens to bob
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);
    await context.updateActor("../../fixtures/key1");

    // check initial balance
    let bobInitTezBalance = await context.tezos.tz.getBalance(bobAddress);
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
    let bobFinalTezBalance = await context.tezos.tz.getBalance(bobAddress);
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
    let firstPairTezBalance = await context.tezos.tz.getBalance(
      firstDexContract.address
    );
    let secondPairTokenBalance = await context.tokens[1].storage.ledger[
      secondDexContract.address
    ].balance;
    let secondPairTezBalance = await context.tezos.tz.getBalance(
      secondDexContract.address
    );

    // 1. check tez balances
    ok(
      bobInitTezBalance.toNumber() > bobFinalTezBalance.toNumber(),
      "Tez should be spent to fee"
    );
    strictEqual(
      firstPairTezBalance.toNumber(),
      10000 - middleTezAmount,
      "Tez not withdrawn"
    );
    strictEqual(
      secondPairTezBalance.toNumber(),
      20000 + middleTezAmount,
      "Tez not received"
    );

    // 2. check tokens balances
    strictEqual(
      bobInitFirstTokenBalance.toNumber() - tokenAmount,
      bobFinalFirstTokenBalance.toNumber(),
      "Tokens not sent"
    );
    strictEqual(
      bobInitSecondTokenBalance.toNumber(),
      bobFinalSecondTokenBalance.toNumber(),
      "Sender tokens should stay the same"
    );
    strictEqual(
      carolInitSecondTokenBalance.toNumber() + minTokensOut,
      carolFinalSecondTokenBalance.toNumber(),
      "Tokens not sent"
    );
    strictEqual(
      firstPairTokenBalance.toNumber(),
      1000000 + tokenAmount,
      "Tokens not received"
    );
    strictEqual(
      secondPairTokenBalance.toNumber(),
      10000 - minTokensOut,
      "Tokens not received"
    );

    // 3. new pairs state
    await context.pairs[0].updateStorage();
    await context.pairs[1].updateStorage();
    strictEqual(
      context.pairs[0].storage.tezPool.toNumber(),
      10000 - middleTezAmount,
      "Tez pool should decrement by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.tokenPool.toNumber(),
      1000000 + tokenAmount,
      "Token pool should decrement by withdrawn amount"
    );
    strictEqual(
      context.pairs[1].storage.tezPool.toNumber(),
      20000 + middleTezAmount,
      "Tez pool should decrement by sent amount"
    );
    strictEqual(
      context.pairs[1].storage.tokenPool.toNumber(),
      10000 - minTokensOut,
      "Token pool should decrement by withdrawn amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      (1000000 + tokenAmount) * (10000 - middleTezAmount),
      "Inveriant should be calculated properly"
    );
    strictEqual(
      context.pairs[1].storage.invariant.toNumber(),
      (20000 + middleTezAmount) * (10000 - minTokensOut),
      "Inveriant should be calculated properly"
    );
  });
});
