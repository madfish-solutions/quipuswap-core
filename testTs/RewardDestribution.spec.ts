import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract("RewardDestribution()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it.only("should distribute loyalty during the one epoch", async function () {
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
        voters: [aliceAddress],
        votes: [delegate],
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
        "loyaltyPaid"
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
  it("should update loyalty during transfer", async function () {});
  it("should update loyalty including frozen amount", async function () {});
  it("should finish period properly", async function () {});
  it("should update loyalty during receiving reward", async function () {});
  it("should distribute reward during the one epoch", async function () {});
  it("should distribute reward during the few epoches", async function () {});
  it("should work if no reward send per epoch", async function () {});
  it("should force reward epoch update", async function () {});
});
