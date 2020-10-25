import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract("RewardDestribution()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should distribute loyalty during the one epoch", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    // store prev balances
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      userRewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.rewardInfo;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // check initial state
    strictEqual(
      initRewardInfo.loyaltyPerShare.toNumber(),
      aliceInitRewardsInfo.loyalty.toNumber(),
      "User and total loyalty mismatch"
    );
    strictEqual(
      aliceInitRewardsInfo.loyaltyPaid.toNumber(),
      0,
      "Paid loyalty shouldn't appear before update"
    );

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      userRewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.rewardInfo;

    // checks
    strictEqual(
      finalRewardInfo.loyaltyPerShare.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber() /
        aliceInitTokenBalance.toNumber(),
      "Total and Alice loyalty mismatch"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
      aliceInitTokenBalance.toNumber() *
        finalRewardInfo.loyaltyPerShare.toNumber(),
      "Paid loyalty should be updated"
    );
  });

  it.only("should distribute loyalty during the one epoch to many users", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await Tezos.signer.publicKeyHash();

    // save initial state
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      userRewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.rewardInfo;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // get shares by Bob
    await context.updateActor("bob");
    let tezAmount = 1000;
    let tokenAmount = 100000;
    let newShares = 100;
    let bobAddress = await Tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);

    await context.updateActor("bob");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [bobAddress],
      userRewards: [bobAddress],
    });
    let bobInitRewardsInfo = context.pairs[0].storage.userRewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let rewardInfoAfterBobInvestment = context.pairs[0].storage.rewardInfo;
    let bobInitTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    // get shares by Carol
    await context.updateActor("carol");
    tezAmount = 2000;
    tokenAmount = 200000;
    newShares = 200;
    let carolAddress = await Tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, carolAddress, tokenAmount);

    await context.updateActor("carol");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [carolAddress],
      userRewards: [carolAddress],
    });
    let carolInitRewardsInfo = context.pairs[0].storage.userRewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let rewardInfoAfterCarolInvestment = context.pairs[0].storage.rewardInfo;
    let carolInitTokenBalance = await context.pairs[0].storage.ledger[
      carolAddress
    ].balance;

    await context.updateActor();

    // update Alice and Bob loyalty
    let value = 0;
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // store updated storage
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      userRewards: [aliceAddress, bobAddress, carolAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let aliceFinalTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobRewardsInfoAfterA2BTransfer = context.pairs[0].storage.userRewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let bobTokenBalanceAfterA2BTransfer = await context.pairs[0].storage.ledger[
      bobAddress
    ].balance;

    let rewardInfoAfterA2BTransfer = context.pairs[0].storage.rewardInfo;

    // check total loyalty
    ok(
      rewardInfoAfterA2BTransfer.loyaltyPerShare
        .minus(rewardInfoAfterCarolInvestment.loyaltyPerShare)
        .eq(
          new BigNumber(1e15)
            .multipliedBy(
              Math.floor(
                (Date.parse(rewardInfoAfterA2BTransfer.lastUpdateTime) -
                  Date.parse(rewardInfoAfterCarolInvestment.lastUpdateTime)) /
                  1000
              )
            )
            .div(context.pairs[0].storage.totalSupply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Total and Alice loyalty mismatch"
    );

    // check loyalty per share
    // check alice loyalty
    // check bob loyalty
    // check alice loyalty paid
    // check bob loyalty paid

    // update Bob and Carol loyalty
    await context.updateActor("bob");
    await context.pairs[0].transfer(bobAddress, carolAddress, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      userRewards: [aliceAddress, bobAddress, carolAddress],
    });
    let carolFinalRewardsInfo = context.pairs[0].storage.userRewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let carolFinalTokenBalance = await context.pairs[0].storage.ledger[
      carolAddress
    ].balance;
    let bobFinalRewardsInfo = context.pairs[0].storage.userRewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let bobFinalTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    let rewardInfoAfterB2CTransfer = context.pairs[0].storage.rewardInfo;

    // // check initial state
    // strictEqual(
    //   initRewardInfo.loyaltyPerShare.toNumber(),
    //   aliceInitRewardsInfo.loyalty.toNumber(),
    //   "User and total loyalty mismatch"
    // );
    // strictEqual(
    //   aliceInitRewardsInfo.loyaltyPaid.toNumber(),
    //   0,
    //   "Paid loyalty shouldn't appear before update"
    // );

    // // checks
    // strictEqual(
    //   finalRewardInfo.loyaltyPerShare.toNumber(),
    //   aliceFinalRewardsInfo.loyalty.toNumber() /
    //     aliceInitTokenBalance.toNumber(),
    //   "Total and Alice loyalty mismatch"
    // );
    // strictEqual(
    //   aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
    //   aliceInitTokenBalance.toNumber() *
    //     finalRewardInfo.loyaltyPerShare.toNumber(),
    //   "Paid loyalty should be updated"
    // );
  });

  it("should distribute loyalty during the few epoches", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;

    for (let i = 0; i < 10; i++) {
      // store prev balances
      let aliceAddress = await Tezos.signer.publicKeyHash();
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        userRewards: [aliceAddress],
      });
      let aliceInitRewardsInfo = context.pairs[0].storage.userRewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        rewardPaid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyaltyPaid: new BigNumber(0),
      };
      let initRewardInfo = context.pairs[0].storage.rewardInfo;
      let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
        aliceAddress
      ].balance;
      let timeLeft =
        Date.parse(initRewardInfo.periodFinish) -
        Date.parse((await Tezos.rpc.getBlockHeader()).timestamp);
      if (timeLeft > 0) {
        await new Promise((r) => setTimeout(r, timeLeft));
      }

      // transfer
      await context.pairs[0].transfer(aliceAddress, bobAddress, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        userRewards: [aliceAddress],
      });
      let aliceFinalRewardsInfo = context.pairs[0].storage.userRewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        rewardPaid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyaltyPaid: new BigNumber(0),
      };
      let finalRewardInfo = context.pairs[0].storage.rewardInfo;

      // checks
      strictEqual(
        finalRewardInfo.loyaltyPerShare.toNumber(),
        aliceFinalRewardsInfo.loyalty.toNumber() /
          aliceInitTokenBalance.toNumber(),
        "Total and Alice loyalty mismatch"
      );
      strictEqual(
        finalRewardInfo.periodFinish,
        initRewardInfo.periodFinish,
        "The period is the same"
      );
      strictEqual(
        aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
        aliceInitTokenBalance.toNumber() *
          finalRewardInfo.loyaltyPerShare.toNumber(),
        "Paid loyalty should be updated"
      );
    }
  });

  it("should distribute loyalty during the few epoches to many users", async function () {});

  it("should update loyalty during transfer", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 500;

    // store prev balances
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress],
      userRewards: [aliceAddress, bobAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let bobInitRewardsInfo = context.pairs[0].storage.userRewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.rewardInfo;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobInitTokenLedger = await context.pairs[0].storage.ledger[bobAddress];
    let bobInitTokenBalance = bobInitTokenLedger
      ? bobInitTokenLedger.balance
      : new BigNumber(0);

    // vote
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress],
      userRewards: [aliceAddress, bobAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.userRewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let bobFinalRewardsInfo = context.pairs[0].storage.userRewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      rewardPaid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyaltyPaid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.rewardInfo;
    let aliceFinalTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobFinalTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    // checks
    strictEqual(
      finalRewardInfo.loyaltyPerShare.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber() /
        aliceInitTokenBalance.toNumber() +
        bobFinalRewardsInfo.loyalty.toNumber(),
      "Total and Alice+Bob loyalty mismatch"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
      aliceFinalTokenBalance.toNumber() *
        finalRewardInfo.loyaltyPerShare.toNumber(),
      "Alice paid loyalty should be updated"
    );
    strictEqual(
      bobFinalRewardsInfo.loyaltyPaid.toNumber(),
      bobFinalTokenBalance.toNumber() *
        finalRewardInfo.loyaltyPerShare.toNumber(),
      "Bob paid loyalty should be updated"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyalty.toNumber(),
      aliceInitTokenBalance.toNumber() *
        finalRewardInfo.loyaltyPerShare.toNumber(),
      "Paid loyalty should be updated"
    );
    strictEqual(
      bobFinalRewardsInfo.loyalty.toNumber(),
      0,
      "Paid loyalty should be updated"
    );
    aliceInitRewardsInfo = aliceFinalRewardsInfo;
    bobInitRewardsInfo = aliceFinalRewardsInfo;
    initRewardInfo = finalRewardInfo;
  });

  it("should update loyalty including frozen amount", async function () {});
  it("should finish period properly", async function () {});
  it("should update loyalty during receiving reward", async function () {});
  it("should distribute reward during the one epoch", async function () {});
  it("should distribute reward during the few epoches", async function () {});
  it("should work if no reward send per epoch", async function () {});
  it("should force reward epoch update", async function () {});
});
