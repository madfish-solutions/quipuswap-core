import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { calculateFee } from "./contracManagers/utils";

contract("TokenToTezPayment()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should exchnge token to tez and update dex state", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let tokenAmount = 1000;
    let minTezOut = 10;

    let pairAddress = context.pairs[0].contract.address;
    let aliceAddress = await tezos.signer.publicKeyHash();

    // update keys
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    // send tokens to bob
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");

    // check initial balance
    let bobInitTezBalance = await tezos.tz.getBalance(bobAddress);
    let carolInitTezBalance = await tezos.tz.getBalance(carolAddress);
    await context.tokens[0].updateStorage({
      ledger: [bobAddress, carolAddress],
    });
    let bobInitTokenLedger = await context.tokens[0].storage.ledger[bobAddress];
    let bobInitTokenBalance = bobInitTokenLedger
      ? bobInitTokenLedger.balance
      : new BigNumber(0);

    // swap tokens liquidity
    let operations = await context.pairs[0].tokenToTezPayment(
      tokenAmount,
      minTezOut,
      carolAddress
    );
    let fees = calculateFee(operations, bobAddress);

    // checks
    let bobFinalTezBalance = await tezos.tz.getBalance(bobAddress);
    await context.tokens[0].updateStorage({
      ledger: [bobAddress, pairAddress, carolAddress],
    });
    let bobFinalTokenLedger = await context.tokens[0].storage.ledger[
      bobAddress
    ];
    let bobFinalTokenBalance = bobFinalTokenLedger
      ? bobFinalTokenLedger.balance
      : new BigNumber(0);
    let carolFinalTezBalance = await tezos.tz.getBalance(carolAddress);

    let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    let pairTezBalance = await tezos.tz.getBalance(pairAddress);

    // 1. tez sent to user
    // strictEqual(
    //   bobInitTezBalance.toNumber() - fees,
    //   bobFinalTezBalance.toNumber(),
    //   "Tez not received"
    // );
    strictEqual(
      carolInitTezBalance.toNumber() + minTezOut,
      carolFinalTezBalance.toNumber(),
      "Tez not received"
    );
    strictEqual(pairTezBalance.toNumber(), 10000 - minTezOut, "Tez not sent");

    // 2. tokens withdrawn and sent to pair contracts
    strictEqual(
      bobInitTokenBalance.toNumber() - tokenAmount,
      bobFinalTokenBalance.toNumber(),
      "Tokens not sent"
    );
    strictEqual(
      pairTokenBalance.toNumber(),
      1000000 + tokenAmount,
      "Tokens not received"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage();
    strictEqual(
      context.pairs[0].storage.tez_pool.toNumber(),
      10000 - minTezOut,
      "Tez pool should decrement by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.token_pool.toNumber(),
      1000000 + tokenAmount,
      "Token pool should decrement by withdrawn amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      (1000000 + tokenAmount) * (10000 - minTezOut),
      "Inveriant should be calculated properly"
    );
  });

  it("should fail if min tez amount is too low", async function () {
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let tokenAmount = 1000;
    let minTezOut = 0;

    // attempt to exchange tokens
    await rejects(
      context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Swap Dex should fail"
    );
  });

  it("should fail if min tez amount is too high", async function () {
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let tokenAmount = 1000;
    let minTezOut = 1000;

    // attempt to exchange tokens
    await rejects(
      context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress),
      (err) => {
        strictEqual(
          err.message,
          "Dex/high-min-tez-out",
          "Error message mismatch"
        );
        return true;
      },
      "Swap Dex should fail"
    );
  });

  if (process.env.EXCHANGE_TOKEN_STANDARD === "FA12") {
    it("should fail if not enough tokens are approved", async function () {
      let tokenAmount = 1000;
      let minTezOut = 10;

      // get alice address
      await context.updateActor("bob");
      let bobAddress = await tezos.signer.publicKeyHash();
      await context.updateActor();

      // attempt to exchange tokens
      await rejects(
        context.pairs[0].contract.methods
          .use(2, "tokenToTezPayment", tokenAmount, minTezOut, bobAddress)
          .send(),
        (err) => {
          strictEqual(
            err.message,
            "NotEnoughAllowance",
            "Error message mismatch"
          );
          return true;
        },
        "Swap Dex should fail"
      );
    });
  }

  it("should fail if tokens amount is too low", async function () {
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let tokenAmount = 0;
    let minTezOut = 1000;

    // attempt to exchange tokens
    await rejects(
      context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Swap Dex should fail"
    );
  });
});
