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
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let delegate = carolAddress;
    let value = 50;

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

    // check initial state
    strictEqual(
      initRewardInfo.totalAccomulatedLoyalty.toNumber(),
      aliceInitRewardsInfo.loyalty.toNumber(),
      "User and total loyalty mismatch"
    );
    strictEqual(
      aliceInitRewardsInfo.loyaltyPaid.toNumber(),
      0,
      "Paid loyalty shouldn't appear before update"
    );

    for (let i = 0; i < 10; i++) {
      // vote
      await context.pairs[0].vote(aliceAddress, delegate, value);

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
        finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
        aliceFinalRewardsInfo.loyalty.toNumber(),
        "Total and Alice loyalty mismatch"
      );
      strictEqual(
        aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
        finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
        "Paid loyalty should be updated"
      );
      strictEqual(
        aliceFinalRewardsInfo.loyalty.toNumber(),
        finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
        "Paid loyalty should be updated"
      );
      aliceInitRewardsInfo = aliceFinalRewardsInfo;
      initRewardInfo = finalRewardInfo;
    }
  });

  it("should distribute loyalty during the one epoch to many users", async function () {});
  it("should distribute loyalty during the few epoches", async function () {});
  it("should distribute loyalty during the few epoches to many users", async function () {});
  it.only("should update loyalty during transfer", async function () {
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
    let aliceInitTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobInitTokenLedger = await context.tokens[0].storage.ledger[bobAddress];
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
    let aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobFinalTokenBalance = await context.tokens[0].storage.ledger[
      bobAddress
    ].balance;

    // checks
    strictEqual(
      finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber() /
        aliceInitTokenBalance.toNumber() +
        bobFinalRewardsInfo.loyalty.toNumber(),
      "Total and Alice+Bob loyalty mismatch"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyaltyPaid.toNumber(),
      finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
      "Alice paid loyalty should be updated"
    );
    strictEqual(
      bobFinalRewardsInfo.loyaltyPaid.toNumber(),
      finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
      "Bob paid loyalty should be updated"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyalty.toNumber(),
      finalRewardInfo.totalAccomulatedLoyalty.toNumber(),
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
