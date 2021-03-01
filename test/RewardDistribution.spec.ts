import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { calculateFee, bakeBlocks } from "./helpers/utils";
import accounts from "./accounts/accounts";
import { defaultAccountInfo, accuracy } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract("RewardsDistribution()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(3, "withdraw_profit");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    await context.setDexFactoryFunction(6, "vote");
    await context.setDexFactoryFunction(7, "veto");
    await context.setDexFactoryFunction(8, "receive_reward");
    await context.factory.setTokenFunction(0, "transfer");
    await context.factory.setTokenFunction(
      1,
      standard == "FA2" ? "update_operators" : "approve"
    );
    pairAddress = await context.createPair({
      tezAmount: 100,
      tokenAmount: 100,
    });
    tokenAddress = await context.pairs[0].contract.address;
    await context.tokens[0].transfer(aliceAddress, bobAddress, 1000000);
    await context.pairs[0].sendReward(1000);
  });

  function defaultSuccessCase(
    decription,
    sender,
    wait,
    action,
    rewardWithdrawn = false,
    receiver = undefined
  ) {
    it(decription, async function () {
      await context.updateActor(sender);
      const senderAddress: string = accounts[sender].pkh;
      receiver = receiver || senderAddress;
      const aliceInitTezBalance = new BigNumber(
        await tezos.tz.getBalance(receiver)
      );
      await context.pairs[0].updateStorage({
        ledger: [senderAddress],
        user_rewards: [senderAddress],
      });
      const initRewardInfo = context.pairs[0].storage;
      const initRecord =
        (await context.pairs[0].storage.ledger[senderAddress]) ||
        defaultAccountInfo;
      const initTotalSupply = context.pairs[0].storage.total_supply;
      const initUserRewards = context.pairs[0].storage.user_rewards[
        senderAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
      };
      if (wait) {
        await bakeBlocks(wait);
      }
      const op = await action();
      const fee =
        receiver == senderAddress ? await calculateFee([op], senderAddress) : 0;
      await context.pairs[0].updateStorage({
        user_rewards: [senderAddress],
        ledger: [senderAddress],
      });
      const finalRewardInfo = context.pairs[0].storage;
      const finalTotalSupply = context.pairs[0].storage.total_supply;
      const finalUserRewards = context.pairs[0].storage.user_rewards[
        senderAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
      };
      const finalRecord =
        (await context.pairs[0].storage.ledger[senderAddress]) ||
        defaultAccountInfo;
      const aliceFinalTezBalance = new BigNumber(
        await tezos.tz.getBalance(receiver)
      );
      const accomulatedReward = new BigNumber(1)
        .multipliedBy(
          Math.floor(
            (Date.parse(finalRewardInfo.last_update_time) -
              Date.parse(initRewardInfo.last_update_time)) /
              1000
          )
        )
        .multipliedBy(initRewardInfo.reward_per_sec);
      const expectedUserReward = initUserRewards.reward.plus(
        initRecord.balance
          .plus(initRecord.frozen_balance)
          .multipliedBy(finalRewardInfo.reward_per_share)
          .minus(initUserRewards.reward_paid)
      );
      const expectedRewardPaid = finalRecord.balance
        .plus(finalRecord.frozen_balance)
        .multipliedBy(finalRewardInfo.reward_per_share);
      strictEqual(
        finalUserRewards.reward_paid.toString(),
        expectedRewardPaid.toString()
      );
      if (rewardWithdrawn) {
        strictEqual(finalUserRewards.reward.toString(), "0");
        const realReward = expectedUserReward
          .div(accuracy)
          .integerValue(BigNumber.ROUND_DOWN);
        ok(
          aliceFinalTezBalance
            .plus(fee)
            .minus(aliceInitTezBalance)
            .eq(realReward)
        );
      } else {
        strictEqual(
          finalUserRewards.reward.toString(),
          expectedUserReward.toString()
        );
        ok(
          aliceFinalTezBalance
            .minus(aliceInitTezBalance)
            .lte(expectedUserReward)
        );
      }
      if (initRewardInfo.period_finish == finalRewardInfo.period_finish) {
        const accomulatedReward = new BigNumber(1)
          .multipliedBy(
            Math.floor(
              (Date.parse(finalRewardInfo.last_update_time) -
                Date.parse(initRewardInfo.last_update_time)) /
                1000
            )
          )
          .multipliedBy(initRewardInfo.reward_per_sec);
        strictEqual(
          finalRewardInfo.reward.toNumber(),
          initRewardInfo.reward.toNumber()
        );
        strictEqual(
          finalRewardInfo.total_reward.toNumber(),
          initRewardInfo.total_reward.toNumber()
        );
        strictEqual(
          finalRewardInfo.reward_per_share.toString(),
          initRewardInfo.reward_per_share
            .plus(
              accomulatedReward
                .div(initRewardInfo.total_supply)
                .integerValue(BigNumber.ROUND_DOWN)
            )
            .toString()
        );
      } else {
        strictEqual(finalRewardInfo.reward.toString(), "0");
        const periodDuration =
          (Math.floor(
            Math.floor(
              (Date.parse(finalRewardInfo.last_update_time) -
                Date.parse(initRewardInfo.period_finish)) /
                1000
            ) / 10
          ) +
            1) *
          10;
        strictEqual(
          finalRewardInfo.total_reward.toString(),
          finalRewardInfo.reward_per_sec
            .multipliedBy(periodDuration)
            .div(accuracy)
            .integerValue(BigNumber.ROUND_DOWN)
            .plus(initRewardInfo.total_reward)
            .toString()
        );
        strictEqual(
          finalRewardInfo.reward_per_sec.toString(),
          initRewardInfo.reward
            .multipliedBy(accuracy)
            .div(periodDuration)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString()
        );
        const accomulatedReward = new BigNumber(1)
          .multipliedBy(
            Math.floor(
              (Date.parse(initRewardInfo.period_finish) -
                Date.parse(initRewardInfo.last_update_time)) /
                1000
            )
          )
          .multipliedBy(initRewardInfo.reward_per_sec);
        const accomulatedThisCycleReward = new BigNumber(1)
          .multipliedBy(
            Math.floor(
              (Date.parse(finalRewardInfo.last_update_time) -
                Date.parse(initRewardInfo.period_finish)) /
                1000
            )
          )
          .multipliedBy(finalRewardInfo.reward_per_sec);
        strictEqual(
          finalRewardInfo.reward_per_share.toString(),
          initRewardInfo.reward_per_share
            .plus(
              accomulatedReward
                .div(initRewardInfo.total_supply)
                .integerValue(BigNumber.ROUND_DOWN)
            )
            .plus(
              accomulatedThisCycleReward
                .div(initRewardInfo.total_supply)
                .integerValue(BigNumber.ROUND_DOWN)
            )
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

  describe("Test the loyalty assessment", () => {
    defaultSuccessCase(
      "success in case of update liquidity",
      "alice",
      0,
      function () {
        return context.pairs[0].withdrawProfit(aliceAddress);
      },
      true
    );
    defaultSuccessCase(
      "success in case of user makes new investment",
      "bob",
      0,
      function () {
        return context.pairs[0].investLiquidity(100, 100, 50);
      }
    );
    defaultSuccessCase(
      "success in case of user withdraws shares",
      "alice",
      0,
      function () {
        return context.pairs[0].divestLiquidity(10, 10, 10);
      }
    );
    defaultSuccessCase(
      "success in case of user transfers shares",
      "alice",
      0,
      function () {
        return context.pairs[0].transfer(aliceAddress, bobAddress, 10);
      }
    );
  });

  describe("Test the user's reward distribution", () => {
    defaultSuccessCase(
      "success in case of reward is claimed before period finished",
      "alice",
      0,
      function () {
        return context.pairs[0].withdrawProfit(aliceAddress);
      },
      true
    );
    defaultSuccessCase(
      "success in case of reward is claimed after period finished",
      "bob",
      7,
      function () {
        return context.pairs[0].withdrawProfit(aliceAddress);
      },
      true,
      accounts["alice"].pkh
    );
    defaultSuccessCase(
      "success in case of reward is claimed in the middle of the second period",
      "alice",
      3,
      function () {
        return context.pairs[0].withdrawProfit(bobAddress);
      },
      true,
      accounts["bob"].pkh
    );
  });

  describe("Test the user's reward distribution with different total rewards", () => {
    defaultSuccessCase(
      "success in case of no reward",
      "alice",
      0,
      function () {
        return context.pairs[0].withdrawProfit(aliceAddress);
      },
      true
    );
    describe("", async function () {
      before(async function () {
        await context.updateActor("bob");
        await context.pairs[0].sendReward(2000);
      });
      defaultSuccessCase(
        "success in case of reward is accomulated",
        "bob",
        7,
        function () {
          return context.pairs[0].withdrawProfit(aliceAddress);
        },
        true,
        accounts["alice"].pkh
      );
    });
    describe("", async function () {
      before(async function () {
        await context.updateActor("alice");
        await context.pairs[0].divestLiquidity(1, 1, 80);
      });
      defaultSuccessCase(
        "success in case of reward is claimed in the middle of the second period",
        "alice",
        0,
        function () {
          return context.pairs[0].withdrawProfit(bobAddress);
        },
        true,
        accounts["bob"].pkh
      );
    });
  });
});
