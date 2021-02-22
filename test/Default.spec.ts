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
      const accomulatedReward = new BigNumber(1)
        .multipliedBy(
          Math.floor(
            (Date.parse(finalRewardInfo.last_update_time) -
              Date.parse(initRewardInfo.last_update_time)) /
              1000
          )
        )
        .multipliedBy(initRewardInfo.reward_per_sec);
      if (initRewardInfo.period_finish == finalRewardInfo.period_finish) {
        strictEqual(
          finalRewardInfo.reward.toNumber(),
          initRewardInfo.reward.toNumber() + amount
        );
        strictEqual(
          finalRewardInfo.reward_per_share.toString(),
          initRewardInfo.total_reward
            .plus(
              accomulatedReward
                .div(initRewardInfo.total_supply)
                .integerValue(BigNumber.ROUND_DOWN)
            )
            .toString()
        );
        strictEqual(
          finalRewardInfo.total_reward.toNumber(),
          initRewardInfo.total_reward.toNumber()
        );
      } else {
        strictEqual(finalRewardInfo.reward.toString(), amount.toString());
        strictEqual(
          finalRewardInfo.total_reward.toString(),
          initRewardInfo.reward.plus(initRewardInfo.total_reward).toString()
        );
        strictEqual(
          finalRewardInfo.reward_per_sec.toString(),
          initRewardInfo.reward.plus(initRewardInfo.total_reward).toString()
        );
        strictEqual(
          finalRewardInfo.reward_per_sec.toString(),
          initRewardInfo.reward
            .multipliedBy(accuracy)
            .div(initRewardInfo.total_supply)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString()
        );
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
