import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

contract("RewardDestribution()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should distribute loyalty to one user", async function () {
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

  it("should distribute loyalty to many users", async function () {
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

    let accomulatedLoyaltyAfterCarolInvestment = new BigNumber(
      1e15
    ).multipliedBy(
      Math.floor(
        (Date.parse(rewardInfoAfterA2BTransfer.lastUpdateTime) -
          Date.parse(rewardInfoAfterCarolInvestment.lastUpdateTime)) /
          1000
      )
    );

    // check loyalty per share
    ok(
      rewardInfoAfterA2BTransfer.loyaltyPerShare
        .minus(rewardInfoAfterCarolInvestment.loyaltyPerShare)
        .eq(
          accomulatedLoyaltyAfterCarolInvestment
            .div(context.pairs[0].storage.totalSupply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after Carol investment is wrong"
    );
    // check accomulated loyalty
    ok(
      rewardInfoAfterA2BTransfer.totalAccomulatedLoyalty
        .minus(rewardInfoAfterCarolInvestment.totalAccomulatedLoyalty)
        .eq(accomulatedLoyaltyAfterCarolInvestment),
      "Total accomulated loyalty mismatch"
    );

    // check alice loyalty
    ok(
      aliceFinalRewardsInfo.loyalty.eq(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyaltyPerShare
        )
      ),
      "Alice loyalty is wrong"
    );
    ok(
      aliceFinalRewardsInfo.loyalty.gt(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterBobInvestment.loyaltyPerShare
        )
      ),
      "Alice loyalty is too small"
    );
    ok(
      aliceFinalRewardsInfo.loyalty.gt(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterCarolInvestment.loyaltyPerShare
        )
      ),
      "Alice loyalty is too small"
    );

    // check bob loyalty

    ok(
      bobRewardsInfoAfterA2BTransfer.loyalty.eq(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterA2BTransfer.loyaltyPerShare)
          .minus(bobInitRewardsInfo.loyaltyPaid)
      ),
      "Bob loyalty is wrong"
    );
    ok(
      bobRewardsInfoAfterA2BTransfer.loyalty.gt(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterCarolInvestment.loyaltyPerShare)
          .minus(bobInitRewardsInfo.loyaltyPaid)
      ),
      "Bob loyalty is too small"
    );

    // check alice loyalty paid
    ok(
      aliceFinalRewardsInfo.loyaltyPaid.eq(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyaltyPerShare
        )
      ),
      "Alice loyalty paid is wrong"
    );

    // check bob loyalty paid
    ok(
      bobRewardsInfoAfterA2BTransfer.loyaltyPaid.eq(
        bobInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyaltyPerShare
        )
      ),
      "Bob loyalty paid is wrong"
    );

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

    // check loyalty per share
    ok(
      rewardInfoAfterB2CTransfer.loyaltyPerShare
        .minus(rewardInfoAfterA2BTransfer.loyaltyPerShare)
        .eq(
          accomulatedLoyaltyAfterCarolInvestment
            .div(context.pairs[0].storage.totalSupply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after Carol investment is wrong"
    );
    // check accomulated loyalty
    ok(
      rewardInfoAfterB2CTransfer.totalAccomulatedLoyalty
        .minus(rewardInfoAfterA2BTransfer.totalAccomulatedLoyalty)
        .eq(accomulatedLoyaltyAfterCarolInvestment),
      "Total accomulated loyalty mismatch"
    );

    // check Carol loyalty
    ok(
      carolFinalRewardsInfo.loyalty.eq(
        carolInitTokenBalance
          .multipliedBy(rewardInfoAfterB2CTransfer.loyaltyPerShare)
          .minus(carolInitRewardsInfo.loyaltyPaid)
      ),
      "Carol loyalty is wrong"
    );
    ok(
      carolFinalRewardsInfo.loyalty.gt(
        carolInitTokenBalance
          .multipliedBy(rewardInfoAfterA2BTransfer.loyaltyPerShare)
          .minus(carolInitRewardsInfo.loyaltyPaid)
      ),
      "Carol loyalty is too small"
    );

    // check Bob loyalty
    ok(
      bobFinalRewardsInfo.loyalty.eq(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterB2CTransfer.loyaltyPerShare)
          .minus(bobInitRewardsInfo.loyaltyPaid)
      ),
      "Bob loyalty is wrong"
    );
    ok(
      bobFinalRewardsInfo.loyalty.gt(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterCarolInvestment.loyaltyPerShare)
          .minus(bobInitRewardsInfo.loyaltyPaid)
      ),
      "Bob loyalty is too small"
    );

    // check carol loyalty paid
    ok(
      carolFinalRewardsInfo.loyaltyPaid.eq(
        carolInitTokenBalance.multipliedBy(
          rewardInfoAfterB2CTransfer.loyaltyPerShare
        )
      ),
      "Carol loyalty paid is wrong"
    );

    // check bob loyalty paid
    ok(
      bobFinalRewardsInfo.loyaltyPaid.eq(
        bobInitTokenBalance.multipliedBy(
          rewardInfoAfterB2CTransfer.loyaltyPerShare
        )
      ),
      "Bob loyalty paid is wrong"
    );
  });

  it.only("should distribute loyalty during the few epoches", async function () {
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
        Date.parse((await Tezos.rpc.getBlockHeader()).timestamp) +
        1;
      if (timeLeft > 0) {
        console.log(Date.parse((await Tezos.rpc.getBlockHeader()).timestamp));
        await sleep(timeLeft);
      }
      console.log(Date.parse((await Tezos.rpc.getBlockHeader()).timestamp));
      console.log(Date.parse(initRewardInfo.periodFinish));

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
      console.log(Date.parse(finalRewardInfo.periodFinish));
      console.log(Date.parse((await Tezos.rpc.getBlockHeader()).timestamp));
      console.log();

      // checks
      strictEqual(
        finalRewardInfo.loyaltyPerShare.toNumber(),
        aliceFinalRewardsInfo.loyalty.toNumber() /
          aliceInitTokenBalance.toNumber(),
        "Total and Alice loyalty mismatch"
      );
      notStrictEqual(
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

  it("should update loyalty including frozen amount", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 100;
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

    // vote
    await context.pairs[0].vote(aliceAddress, bobAddress, value);

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

    // check loyalty per share
    let accomulatedLoyaltyAfterVoting = new BigNumber(1e15).multipliedBy(
      Math.floor(
        (Date.parse(finalRewardInfo.lastUpdateTime) -
          Date.parse(initRewardInfo.lastUpdateTime)) /
          1000
      )
    );
    ok(
      finalRewardInfo.loyaltyPerShare
        .minus(initRewardInfo.loyaltyPerShare)
        .eq(
          accomulatedLoyaltyAfterVoting
            .div(context.pairs[0].storage.totalSupply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after voting is wrong"
    );
    // check accomulated loyalty
    ok(
      finalRewardInfo.totalAccomulatedLoyalty
        .minus(initRewardInfo.totalAccomulatedLoyalty)
        .eq(accomulatedLoyaltyAfterVoting),
      "Total accomulated loyalty mismatch"
    );

    // check alice loyalty
    ok(
      aliceFinalRewardsInfo.loyalty.eq(
        aliceInitTokenBalance.multipliedBy(finalRewardInfo.loyaltyPerShare)
      ),
      "Alice loyalty is wrong"
    );

    // check alice loyalty paid
    ok(
      aliceFinalRewardsInfo.loyaltyPaid.eq(
        aliceInitTokenBalance.multipliedBy(finalRewardInfo.loyaltyPerShare)
      ),
      "Alice loyalty paid is wrong"
    );
  });

  it.only("should update loyalty during receiving reward", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let value = 1000;
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

    // trnsfer
    await context.pairs[0].sendReward(value);

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
    let accomulatedLoyalty = new BigNumber(1e15).multipliedBy(
      Math.floor(
        (Date.parse(finalRewardInfo.lastUpdateTime) -
          Date.parse(initRewardInfo.lastUpdateTime)) /
          1000
      )
    );

    // checks
    strictEqual(
      finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
      accomulatedLoyalty.toNumber(),
      "Total accomulated loyalty is wrong"
    );
    strictEqual(
      finalRewardInfo.reward.toNumber(),
      value,
      "Total accomulated loyalty is wrong"
    );
    strictEqual(
      finalRewardInfo.loyaltyPerShare.toNumber(),
      accomulatedLoyalty.toNumber() /
        context.pairs[0].storage.totalSupply.toNumber(),
      "Loyalty per share isn't calculated properly"
    );
  });

  it("should finish period properly", async function () {
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
    await context.pairs[0].updateStorage({});
    let initRewardInfo = context.pairs[0].storage.rewardInfo;

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({});
    let finalRewardInfo = context.pairs[0].storage.rewardInfo;

    // checks
    notStrictEqual(
      finalRewardInfo.periodFinish,
      initRewardInfo.periodFinish,
      "Period finish should be updated"
    );
  });

  it("shouldn't update finish period before the time", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    let aliceAddress = await Tezos.signer.publicKeyHash();

    // trnsfer to update the period
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // store prev balances
    await context.pairs[0].updateStorage({});
    let initRewardInfo = context.pairs[0].storage.rewardInfo;

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({});
    let finalRewardInfo = context.pairs[0].storage.rewardInfo;

    // checks
    strictEqual(
      finalRewardInfo.periodFinish,
      initRewardInfo.periodFinish,
      "Period finish shouldn't be updated"
    );
  });

  it("should distribute reward during the one epoch", async function () {});

  it("should distribute reward during the few epoches", async function () {});

  it("should work if no reward send per epoch", async function () {});

  it("should force reward epoch update", async function () {});
});
