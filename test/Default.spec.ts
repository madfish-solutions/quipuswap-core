import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { calculateFee, bakeBlocks } from "./helpers/utils";
import accounts from "./accounts/accounts";
import { defaultAccountInfo, accuracy } from "./constants";

contract("Default()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(3, "withdraw_profit");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    await context.setDexFactoryFunction(8, "receive_reward");
    pairAddress = await context.createPair({
      tezAmount: 100,
      tokenAmount: 100,
    });
    tokenAddress = await context.pairs[0].contract.address;
  });

  function defaultSuccessCase(decription, sender, wait, amount) {
    it(decription, async function () {
      await context.updateActor(sender);
      await context.pairs[0].updateStorage();
      const initRewardInfo = context.pairs[0].storage;
      const initTotalSupply = context.pairs[0].storage.total_supply;
      if (wait) {
        await bakeBlocks(wait);
      }
      await context.pairs[0].sendReward(amount);
      await context.pairs[0].updateStorage();
      const finalRewardInfo = context.pairs[0].storage;
      const finalTotalSupply = context.pairs[0].storage.total_supply;
      const accomulatedLoyalty = new BigNumber(1e15).multipliedBy(
        Math.floor(
          (Date.parse(finalRewardInfo.last_update_time) -
            Date.parse(initRewardInfo.last_update_time)) /
            1000
        )
      );
      ok(
        finalRewardInfo.reward_per_share
          .minus(initRewardInfo.reward_per_share)
          .eq(
            accomulatedLoyalty
              .div(initTotalSupply)
              .integerValue(BigNumber.ROUND_DOWN)
          )
      );
      if (initRewardInfo.period_finish == finalRewardInfo.period_finish) {
        strictEqual(
          finalRewardInfo.reward.toNumber(),
          initRewardInfo.reward.toNumber() + amount
        );
      } else {
        strictEqual(finalRewardInfo.reward.toNumber(), amount);
        // strictEqual(
        //   finalRewardInfo.reward_per_token
        //     .minus(initRewardInfo.reward_per_token)
        //     .toNumber(),
        //   initRewardInfo.reward
        //     .multipliedBy(accuracy)
        //     .multipliedBy(accuracy)
        //     .div(finalRewardInfo.total_accomulated_loyalty)
        //     .integerValue(BigNumber.ROUND_DOWN)
        //     .toNumber()
        // );
      }
    });
  }

  function defaultFailCase(decription, sender, amount, errorMsg) {
    it(decription, async function () {
      await context.updateActor(sender);
      await rejects(context.pairs[0].sendReward(amount), (err) => {
        ok(err.message == errorMsg, "Error message mismatch");
        return true;
      });
    });
  }

  describe("Test the rewards assessment in case of differrent shares", () => {
    defaultSuccessCase("success in case of some shares", "alice", 0, 1000);
    describe("", async function () {
      before(async function () {
        await context.updateActor("alice");
        await context.pairs[0].divestLiquidity(1, 1, 100);
      });
      defaultFailCase("revert in case of no shares", "alice", 1000, "DIV by 0");
      after(async function () {
        await context.updateActor("alice");
        await context.pairs[0].initializeExchange(100, 100);
      });
    });
  });

  describe("Test the rewards assessment in case of differrent reward sent", () => {
    defaultSuccessCase("success in case of some xtz sent", "alice", 0, 1000);
    defaultSuccessCase("success in case of no xtz sent", "alice", 0, 0);
  });

  describe("Test the total rewards assessments in case of different periods", () => {
    defaultSuccessCase(
      "success in case of before period finished",
      "alice",
      0,
      1000
    );
    defaultSuccessCase(
      "success in case of after period finished",
      "alice",
      10,
      1000
    );
    defaultSuccessCase(
      "success in case of in the middle of the second period",
      "alice",
      0,
      1000
    );
  });
});
