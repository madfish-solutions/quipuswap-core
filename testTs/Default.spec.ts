import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { calculateFee, bakeBlocks } from "./helpers/utils";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";

contract.only("Default()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const tezAmount: number = 100;
  const tokenAmount: number = 100;
  const newShares: number = 100;

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
      const senderAddress: string = accounts[sender].pkh;
      await context.pairs[0].updateStorage();
      const initRewardInfo = context.pairs[0].storage.reward_info;
      const initTotalSupply = context.pairs[0].storage.total_supply;
      if (wait) {
        await bakeBlocks(wait);
      }
      await context.pairs[0].sendReward(amount);
      await context.pairs[0].updateStorage();
      const finalRewardInfo = context.pairs[0].storage.reward_info;
      const finalTotalSupply = context.pairs[0].storage.total_supply;
      const accomulatedLoyalty = new BigNumber(1e15).multipliedBy(
        Math.floor(
          (Date.parse(finalRewardInfo.last_update_time) -
            Date.parse(initRewardInfo.last_update_time)) /
            1000
        )
      );
      strictEqual(
        finalRewardInfo.reward.toNumber(),
        initRewardInfo.reward.toNumber() + amount,
        "Tokens not removed"
      );
      ok(
        finalRewardInfo.loyalty_per_share
          .minus(initRewardInfo.loyalty_per_share)
          .eq(
            accomulatedLoyalty
              .div(initTotalSupply)
              .integerValue(BigNumber.ROUND_DOWN)
          ),
        "Loyalty per share after Carol investment is wrong"
      );
      ok(
        finalRewardInfo.total_accomulated_loyalty
          .minus(initRewardInfo.total_accomulated_loyalty)
          .eq(accomulatedLoyalty),
        "Loyalty per share after  is wrong"
      );
      // strictEqual(
      //   finalRewardInfo.reward_per_token
      //     .minus(initRewardInfo.reward_per_token)
      //     .toNumber(),
      //   new BigNumber(amount)
      //     .div(initTotalSupply)
      //     .integerValue(BigNumber.ROUND_DOWN)
      //     .toNumber(),
      //   "Loyalty per share after  is wrong"
      // );
    });
  }

  function defaultFailCase(decription, sender, amount, errorMsg) {
    it(decription, async function () {
      await context.updateActor(sender);
      await rejects(
        context.pairs[0].sendReward(amount),
        (err) => {
          console.log(err.message);
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });
  }

  describe.only("Test the rewards assessment in case of differrent shares", () => {
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

  describe.only("Test the rewards assessment in case of differrent reward sent", () => {
    defaultSuccessCase("success in case of some xtz sent", "alice", 0, 1000);
    defaultSuccessCase("success in case of no xtz sent", "alice", 0, 0);
  });

  describe.only("Test the total rewards assessments in case of different periods", () => {
    defaultSuccessCase(
      "success in case of before period finished",
      "alice",
      0,
      1000
    );
    defaultSuccessCase(
      "success in case of after period finished",
      "alice",
      0,
      1000
    );
    defaultSuccessCase(
      "success in case of in the middle of the second period",
      "alice",
      0,
      1000
    );
  });

  it("should distribute loyalty to one user", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // check initial state
    strictEqual(
      initRewardInfo.loyalty_per_share.toNumber(),
      aliceInitRewardsInfo.loyalty.toNumber(),
      "User and total loyalty mismatch"
    );
    strictEqual(
      aliceInitRewardsInfo.loyalty_paid.toNumber(),
      0,
      "Paid loyalty shouldn't appear before update"
    );

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(
      finalRewardInfo.total_accomulated_loyalty.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber(),
      "Total accomulted loyalty and Alice loyalty mismatch"
    );
    strictEqual(
      finalRewardInfo.loyalty_per_share.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber() /
        aliceInitTokenBalance.toNumber(),
      "Total and Alice loyalty mismatch"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyalty_paid.toNumber(),
      aliceInitTokenBalance.toNumber() *
        finalRewardInfo.loyalty_per_share.toNumber(),
      "Paid loyalty should be updated"
    );
  });

  it("should distribute loyalty to many users", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await tezos.signer.publicKeyHash();

    // save initial state
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // get shares by Bob
    await context.updateActor("bob");
    let tezAmount = 1000;
    let tokenAmount = 100000;
    let newShares = 100;
    let bobAddress = await tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);

    await context.updateActor("bob");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [bobAddress],
      user_rewards: [bobAddress],
    });
    let bobInitRewardsInfo = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let rewardInfoAfterBobInvestment = context.pairs[0].storage.reward_info;
    let bobInitTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    // get shares by Carol
    await context.updateActor("carol");
    tezAmount = 2000;
    tokenAmount = 200000;
    newShares = 200;
    let carolAddress = await tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, carolAddress, tokenAmount);

    await context.updateActor("carol");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [carolAddress],
      user_rewards: [carolAddress],
    });
    let carolInitRewardsInfo = context.pairs[0].storage.user_rewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let rewardInfoAfterCarolInvestment = context.pairs[0].storage.reward_info;
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
      user_rewards: [aliceAddress, bobAddress, carolAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let aliceFinalTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobRewardsInfoAfterA2BTransfer = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let bobTokenBalanceAfterA2BTransfer = await context.pairs[0].storage.ledger[
      bobAddress
    ].balance;

    let rewardInfoAfterA2BTransfer = context.pairs[0].storage.reward_info;

    let accomulatedLoyaltyAfterCarolInvestment = new BigNumber(
      1e15
    ).multipliedBy(
      Math.floor(
        (Date.parse(rewardInfoAfterA2BTransfer.last_update_time) -
          Date.parse(rewardInfoAfterCarolInvestment.last_update_time)) /
          1000
      )
    );

    // check loyalty per share
    ok(
      rewardInfoAfterA2BTransfer.loyalty_per_share
        .minus(rewardInfoAfterCarolInvestment.loyalty_per_share)
        .eq(
          accomulatedLoyaltyAfterCarolInvestment
            .div(context.pairs[0].storage.total_supply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after Carol investment is wrong"
    );
    // check accomulated loyalty
    ok(
      rewardInfoAfterA2BTransfer.total_accomulated_loyalty
        .minus(rewardInfoAfterCarolInvestment.total_accomulated_loyalty)
        .eq(accomulatedLoyaltyAfterCarolInvestment),
      "Total accomulated loyalty mismatch"
    );

    // check alice loyalty
    ok(
      aliceFinalRewardsInfo.loyalty.eq(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyalty_per_share
        )
      ),
      "Alice loyalty is wrong"
    );
    ok(
      aliceFinalRewardsInfo.loyalty.gt(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterBobInvestment.loyalty_per_share
        )
      ),
      "Alice loyalty is too small"
    );
    ok(
      aliceFinalRewardsInfo.loyalty.gt(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterCarolInvestment.loyalty_per_share
        )
      ),
      "Alice loyalty is too small"
    );

    // check bob loyalty

    ok(
      bobRewardsInfoAfterA2BTransfer.loyalty.eq(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterA2BTransfer.loyalty_per_share)
          .minus(bobInitRewardsInfo.loyalty_paid)
      ),
      "Bob loyalty is wrong"
    );
    ok(
      bobRewardsInfoAfterA2BTransfer.loyalty.gt(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterCarolInvestment.loyalty_per_share)
          .minus(bobInitRewardsInfo.loyalty_paid)
      ),
      "Bob loyalty is too small"
    );

    // check alice loyalty paid
    ok(
      aliceFinalRewardsInfo.loyalty_paid.eq(
        aliceInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyalty_per_share
        )
      ),
      "Alice loyalty paid is wrong"
    );

    // check bob loyalty paid
    ok(
      bobRewardsInfoAfterA2BTransfer.loyalty_paid.eq(
        bobInitTokenBalance.multipliedBy(
          rewardInfoAfterA2BTransfer.loyalty_per_share
        )
      ),
      "Bob loyalty paid is wrong"
    );

    // update Bob and Carol loyalty
    await context.updateActor("bob");
    await context.pairs[0].transfer(bobAddress, carolAddress, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      user_rewards: [aliceAddress, bobAddress, carolAddress],
    });
    let carolFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let carolFinalTokenBalance = await context.pairs[0].storage.ledger[
      carolAddress
    ].balance;
    let bobFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let bobFinalTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    let rewardInfoAfterB2CTransfer = context.pairs[0].storage.reward_info;

    // check loyalty per share
    ok(
      rewardInfoAfterB2CTransfer.loyalty_per_share
        .minus(rewardInfoAfterA2BTransfer.loyalty_per_share)
        .eq(
          accomulatedLoyaltyAfterCarolInvestment
            .div(context.pairs[0].storage.total_supply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after Carol investment is wrong"
    );
    // check accomulated loyalty
    ok(
      rewardInfoAfterB2CTransfer.total_accomulated_loyalty
        .minus(rewardInfoAfterA2BTransfer.total_accomulated_loyalty)
        .eq(accomulatedLoyaltyAfterCarolInvestment),
      "Total accomulated loyalty mismatch"
    );

    // check Carol loyalty
    ok(
      carolFinalRewardsInfo.loyalty.eq(
        carolInitTokenBalance
          .multipliedBy(rewardInfoAfterB2CTransfer.loyalty_per_share)
          .minus(carolInitRewardsInfo.loyalty_paid)
      ),
      "Carol loyalty is wrong"
    );
    ok(
      carolFinalRewardsInfo.loyalty.gt(
        carolInitTokenBalance
          .multipliedBy(rewardInfoAfterA2BTransfer.loyalty_per_share)
          .minus(carolInitRewardsInfo.loyalty_paid)
      ),
      "Carol loyalty is too small"
    );

    // check Bob loyalty
    ok(
      bobFinalRewardsInfo.loyalty.eq(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterB2CTransfer.loyalty_per_share)
          .minus(bobInitRewardsInfo.loyalty_paid)
      ),
      "Bob loyalty is wrong"
    );
    ok(
      bobFinalRewardsInfo.loyalty.gt(
        bobInitTokenBalance
          .multipliedBy(rewardInfoAfterCarolInvestment.loyalty_per_share)
          .minus(bobInitRewardsInfo.loyalty_paid)
      ),
      "Bob loyalty is too small"
    );

    // check carol loyalty paid
    ok(
      carolFinalRewardsInfo.loyalty_paid.eq(
        carolInitTokenBalance.multipliedBy(
          rewardInfoAfterB2CTransfer.loyalty_per_share
        )
      ),
      "Carol loyalty paid is wrong"
    );

    // check bob loyalty paid
    ok(
      bobFinalRewardsInfo.loyalty_paid.eq(
        bobInitTokenBalance.multipliedBy(
          rewardInfoAfterB2CTransfer.loyalty_per_share
        )
      ),
      "Bob loyalty paid is wrong"
    );
  });

  it("should distribute loyalty during the few epoches", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;

    for (let i = 0; i < 3; i++) {
      // store prev balances
      let aliceAddress = await tezos.signer.publicKeyHash();
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let initRewardInfo = context.pairs[0].storage.reward_info;
      let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
        aliceAddress
      ].balance;
      let timeLeft =
        Date.parse(initRewardInfo.period_finish) -
        Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
        1;
      if (timeLeft > 0) {
        await bakeBlocks(timeLeft / 1000);
      }

      // transfer
      await context.pairs[0].transfer(aliceAddress, bobAddress, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let finalRewardInfo = context.pairs[0].storage.reward_info;

      // checks
      strictEqual(
        finalRewardInfo.loyalty_per_share.toNumber(),
        aliceFinalRewardsInfo.loyalty.toNumber() /
          aliceInitTokenBalance.toNumber(),
        "Total and Alice loyalty mismatch"
      );
      notStrictEqual(
        finalRewardInfo.period_finish,
        initRewardInfo.period_finish,
        "The period is the same"
      );
      strictEqual(
        aliceFinalRewardsInfo.loyalty_paid.toNumber(),
        aliceInitTokenBalance.toNumber() *
          finalRewardInfo.loyalty_per_share.toNumber(),
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
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 500;

    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress],
      user_rewards: [aliceAddress, bobAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let bobInitRewardsInfo = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
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
      user_rewards: [aliceAddress, bobAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let bobFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;
    let aliceFinalTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;
    let bobFinalTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    // checks
    strictEqual(
      finalRewardInfo.loyalty_per_share.toNumber(),
      aliceFinalRewardsInfo.loyalty.toNumber() /
        aliceInitTokenBalance.toNumber() +
        bobFinalRewardsInfo.loyalty.toNumber(),
      "Total and Alice+Bob loyalty mismatch"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyalty_paid.toNumber(),
      aliceFinalTokenBalance.toNumber() *
        finalRewardInfo.loyalty_per_share.toNumber(),
      "Alice paid loyalty should be updated"
    );
    strictEqual(
      bobFinalRewardsInfo.loyalty_paid.toNumber(),
      bobFinalTokenBalance.toNumber() *
        finalRewardInfo.loyalty_per_share.toNumber(),
      "Bob paid loyalty should be updated"
    );
    strictEqual(
      aliceFinalRewardsInfo.loyalty.toNumber(),
      aliceInitTokenBalance.toNumber() *
        finalRewardInfo.loyalty_per_share.toNumber(),
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
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 100;
    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // check initial state
    strictEqual(
      initRewardInfo.loyalty_per_share.toNumber(),
      aliceInitRewardsInfo.loyalty.toNumber(),
      "User and total loyalty mismatch"
    );
    strictEqual(
      aliceInitRewardsInfo.loyalty_paid.toNumber(),
      0,
      "Paid loyalty shouldn't appear before update"
    );

    // vote
    await context.pairs[0].vote(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // check loyalty per share
    let accomulatedLoyaltyAfterVoting = new BigNumber(1e15).multipliedBy(
      Math.floor(
        (Date.parse(finalRewardInfo.last_update_time) -
          Date.parse(initRewardInfo.last_update_time)) /
          1000
      )
    );
    ok(
      finalRewardInfo.loyalty_per_share
        .minus(initRewardInfo.loyalty_per_share)
        .eq(
          accomulatedLoyaltyAfterVoting
            .div(context.pairs[0].storage.total_supply)
            .integerValue(BigNumber.ROUND_DOWN)
        ),
      "Loyalty per share after voting is wrong"
    );
    // check accomulated loyalty
    ok(
      finalRewardInfo.total_accomulated_loyalty
        .minus(initRewardInfo.total_accomulated_loyalty)
        .eq(accomulatedLoyaltyAfterVoting),
      "Total accomulated loyalty mismatch"
    );

    // check alice loyalty
    ok(
      aliceFinalRewardsInfo.loyalty.eq(
        aliceInitTokenBalance.multipliedBy(finalRewardInfo.loyalty_per_share)
      ),
      "Alice loyalty is wrong"
    );

    // check alice loyalty paid
    ok(
      aliceFinalRewardsInfo.loyalty_paid.eq(
        aliceInitTokenBalance.multipliedBy(finalRewardInfo.loyalty_per_share)
      ),
      "Alice loyalty paid is wrong"
    );
  });

  it("should update loyalty during receiving reward", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let value = 1000;
    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // trnsfer
    await context.pairs[0].sendReward(value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;
    let accomulatedLoyalty = new BigNumber(1e15).multipliedBy(
      Math.floor(
        (Date.parse(finalRewardInfo.last_update_time) -
          Date.parse(initRewardInfo.last_update_time)) /
          1000
      )
    );

    // checks
    strictEqual(
      finalRewardInfo.total_accomulated_loyalty.toNumber(),
      accomulatedLoyalty.toNumber(),
      "Total accomulated loyalty is wrong"
    );
    strictEqual(
      finalRewardInfo.reward.toNumber(),
      value,
      "Total reward is wrong"
    );
    strictEqual(
      finalRewardInfo.loyalty_per_share.toNumber(),
      Math.floor(accomulatedLoyalty.toNumber() / value),
      "Loyalty per share isn't calculated properly"
    );
  });

  it("should finish period properly", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].updateStorage({});
    let initRewardInfo = context.pairs[0].storage.reward_info;

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({});
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    notStrictEqual(
      finalRewardInfo.period_finish,
      initRewardInfo.period_finish,
      "Period finish should be updated"
    );
  });

  it("shouldn't update finish period before the time", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    let aliceAddress = await tezos.signer.publicKeyHash();

    // transfer to update the period
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // store prev balances
    await context.pairs[0].updateStorage({});
    let initRewardInfo = context.pairs[0].storage.reward_info;

    // trnsfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // checks
    await context.pairs[0].updateStorage({});
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(
      finalRewardInfo.period_finish,
      initRewardInfo.period_finish,
      "Period finish shouldn't be updated"
    );
  });

  it("should distribute reward to the only liquidity provider", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get receiver address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    let aliceAddress = await tezos.signer.publicKeyHash();

    // transfer to update the period
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    value = 1000;
    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // trnsfer
    await context.pairs[0].sendReward(value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceMiddleRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let middleRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(
      middleRewardInfo.reward.toNumber(),
      value,
      "The reward is wrong"
    );
    strictEqual(
      middleRewardInfo.reward_per_token.toNumber(),
      0,
      "Reward per token shouldn't be accomulated"
    );

    // update user reward
    let timeLeft =
      Date.parse(initRewardInfo.period_finish) -
      Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
      1;
    if (timeLeft > 0) {
      await bakeBlocks(timeLeft / 1000);
    }

    // transfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, 0);

    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(finalRewardInfo.reward.toNumber(), 0, "The reward is wrong");
    strictEqual(
      new BigNumber(1e15).multipliedBy(value).toNumber(),
      aliceFinalRewardsInfo.reward.toNumber(),
      "Alice reward should be accomulated"
    );
  });

  it("should distribute reward during the few epoches", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;

    for (let i = 0; i < 3; i++) {
      // store prev balances
      let aliceAddress = await tezos.signer.publicKeyHash();
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let initRewardInfo = context.pairs[0].storage.reward_info;
      let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
        aliceAddress
      ].balance;
      let timeLeft =
        Date.parse(initRewardInfo.period_finish) -
        Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
        1;
      if (timeLeft > 0) {
        // transfer
        await context.pairs[0].sendReward(1000 * i);
        await bakeBlocks(timeLeft / 1000);
      }

      // transfer
      await context.pairs[0].transfer(aliceAddress, bobAddress, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let finalRewardInfo = context.pairs[0].storage.reward_info;

      // checks
      strictEqual(
        aliceFinalRewardsInfo.reward_paid.toNumber(),
        finalRewardInfo.reward_per_token.toNumber(),
        "Alice reward paid mismatch"
      );
      strictEqual(
        aliceFinalRewardsInfo.reward.toNumber(),
        new BigNumber(1e15).multipliedBy((1000 * i * (1 + i)) / 2).toNumber(),
        "Alice reward should be updated"
      );
    }
  });

  it("should work if no reward send per epoch", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get receiver address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;
    let aliceAddress = await tezos.signer.publicKeyHash();

    // transfer to update the period
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    value = 0;
    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let initRewardInfo = context.pairs[0].storage.reward_info;
    let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
      aliceAddress
    ].balance;

    // trnsfer
    await context.pairs[0].sendReward(value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let middleRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(
      middleRewardInfo.reward.toNumber(),
      value,
      "The reward is wrong"
    );
    strictEqual(
      middleRewardInfo.reward_per_token.toNumber(),
      0,
      "Reward per token shouldn't be accomulated"
    );

    // update user reward
    let timeLeft =
      Date.parse(initRewardInfo.period_finish) -
      Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
      1;
    if (timeLeft > 0) {
      await bakeBlocks(timeLeft / 1000);
    }

    // transfer
    await context.pairs[0].transfer(aliceAddress, bobAddress, 0);

    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let finalRewardInfo = context.pairs[0].storage.reward_info;

    // checks
    strictEqual(finalRewardInfo.reward.toNumber(), 0, "The reward is wrong");
    strictEqual(
      aliceFinalRewardsInfo.reward.toNumber(),
      0,
      "Alice reward shouldn't be accomulated"
    );
    strictEqual(
      finalRewardInfo.reward_per_token.toNumber(),
      0,
      "Reward per token shouldn't be accomulated"
    );
  });

  it("should withdraw reward", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 0;

    for (let i = 0; i < 3; i++) {
      // store prev balances
      let aliceAddress = await tezos.signer.publicKeyHash();
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceInitRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let initRewardInfo = context.pairs[0].storage.reward_info;
      let aliceInitTokenBalance = await context.pairs[0].storage.ledger[
        aliceAddress
      ].balance;
      let timeLeft =
        Date.parse(initRewardInfo.period_finish) -
        Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
        1;
      if (timeLeft > 0) {
        await context.pairs[0].sendReward(1000 * i);
        // transfer
        await bakeBlocks(timeLeft / 1000);
      }

      // transfer
      await context.pairs[0].transfer(aliceAddress, bobAddress, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        user_rewards: [aliceAddress],
      });
      let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      let finalRewardInfo = context.pairs[0].storage.reward_info;

      strictEqual(
        aliceFinalRewardsInfo.reward.toNumber(),
        new BigNumber(1e15).multipliedBy(1000 * i).toNumber(),
        "Alice reward should be updated"
      );

      // check withdraw
      let aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      if (i) {
        let operations = await context.pairs[0].withdrawProfit(aliceAddress);
        let fees = calculateFee([operations], aliceAddress);
        let aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
        ok(
          aliceInitTezBalance.toNumber() - fees + 1000 * i >=
            aliceFinalTezBalance.toNumber(),
          "Alice tez balance should be updated"
        );
        ok(
          0.99 * (aliceInitTezBalance.toNumber() - fees + 1000 * i) <
            aliceFinalTezBalance.toNumber(),
          "Alice tez balance should be updated"
        );
      }
    }
  });

  it("should update reward for few users", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].sendReward(0);

    // save initial state
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      user_rewards: [aliceAddress],
    });

    let reward = 1000;
    await context.pairs[0].sendReward(reward);
    // get shares by Bob
    await context.updateActor("bob");
    let tezAmount = 1000;
    let tokenAmount = 100000;
    let newShares = 100;
    let bobAddress = await tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);

    await context.updateActor("bob");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [bobAddress],
      user_rewards: [bobAddress],
    });

    // get shares by Carol
    await context.updateActor("carol");
    tezAmount = 2000;
    tokenAmount = 200000;
    newShares = 200;
    let carolAddress = await tezos.signer.publicKeyHash();

    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, carolAddress, tokenAmount);

    await context.updateActor("carol");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // store updated state
    await context.pairs[0].updateStorage({
      ledger: [carolAddress],
      user_rewards: [carolAddress],
    });
    let rewardInfoAfterCarolInvestment = context.pairs[0].storage.reward_info;

    await context.updateActor();

    // update Alice and Bob loyalty
    let value = 0;
    let timeLeft =
      Date.parse(rewardInfoAfterCarolInvestment.period_finish) -
      Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
      1;
    if (timeLeft > 0) {
      // transfer
      await bakeBlocks(timeLeft / 1000);
    }
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    // store updated storage
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      user_rewards: [aliceAddress, bobAddress, carolAddress],
    });
    let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      aliceAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };

    // update Bob and Carol loyalty
    await context.updateActor("bob");
    await context.pairs[0].transfer(bobAddress, carolAddress, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      user_rewards: [aliceAddress, bobAddress, carolAddress],
    });
    let carolFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let carolFinalTokenBalance = await context.pairs[0].storage.ledger[
      carolAddress
    ].balance;
    let bobFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      bobAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };
    let bobFinalTokenBalance = await context.pairs[0].storage.ledger[bobAddress]
      .balance;

    let rewardInfoAfterB2CTransfer = context.pairs[0].storage.reward_info;

    await context.updateActor("carol");
    await context.pairs[0].transfer(carolAddress, bobAddress, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress, bobAddress, carolAddress],
      user_rewards: [aliceAddress, bobAddress, carolAddress],
    });
    carolFinalRewardsInfo = context.pairs[0].storage.user_rewards[
      carolAddress
    ] || {
      reward: new BigNumber(0),
      reward_paid: new BigNumber(0),
      loyalty: new BigNumber(0),
      loyalty_paid: new BigNumber(0),
    };

    ok(
      bobFinalRewardsInfo.reward
        .plus(aliceFinalRewardsInfo.reward)
        .plus(carolFinalRewardsInfo.reward)
        .gt(new BigNumber(reward * 0.99 * 1e15)),
      "Total reward is too small"
    );
    ok(
      bobFinalRewardsInfo.reward
        .plus(aliceFinalRewardsInfo.reward)
        .plus(carolFinalRewardsInfo.reward)
        .lte(new BigNumber(reward * 1e15)),
      "Total reward is too big"
    );
  });

  it("should update reward for few users during few epoches", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].sendReward(0);

    for (let i = 0; i < 3; i++) {
      let reward = 1000;
      await context.pairs[0].sendReward(reward);

      // get shares by Bob
      await context.updateActor("bob");
      let tezAmount = 1000;
      let tokenAmount = 100000;
      let newShares = 100;
      let bobAddress = await tezos.signer.publicKeyHash();

      await context.updateActor();
      await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);

      await context.updateActor("bob");
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

      // store updated state
      await context.pairs[0].updateStorage({
        ledger: [bobAddress],
        user_rewards: [bobAddress],
      });

      // get shares by Carol
      await context.updateActor("carol");
      tezAmount = 2000;
      tokenAmount = 200000;
      newShares = 200;
      let carolAddress = await tezos.signer.publicKeyHash();

      await context.updateActor();
      await context.tokens[0].transfer(aliceAddress, carolAddress, tokenAmount);

      await context.updateActor("carol");
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

      // store updated state
      await context.pairs[0].updateStorage({
        ledger: [carolAddress],
        user_rewards: [carolAddress],
      });
      let rewardInfoAfterCarolInvestment = context.pairs[0].storage.reward_info;

      await context.updateActor();

      // update Alice and Bob loyalty
      let value = 0;
      let timeLeft =
        Date.parse(rewardInfoAfterCarolInvestment.period_finish) -
        Date.parse((await tezos.rpc.getBlockHeader()).timestamp) +
        1;
      if (timeLeft > 0) {
        // transfer
        await bakeBlocks(timeLeft / 1000);
      }
      await context.pairs[0].transfer(aliceAddress, bobAddress, value);

      // store updated storage
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress, bobAddress, carolAddress],
        user_rewards: [aliceAddress, bobAddress, carolAddress],
      });
      let aliceFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        aliceAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };

      // update Bob and Carol loyalty
      await context.updateActor("bob");
      await context.pairs[0].transfer(bobAddress, carolAddress, value);
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress, bobAddress, carolAddress],
        user_rewards: [aliceAddress, bobAddress, carolAddress],
      });
      let bobFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        bobAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };
      await context.updateActor("carol");
      await context.pairs[0].transfer(carolAddress, bobAddress, value);
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress, bobAddress, carolAddress],
        user_rewards: [aliceAddress, bobAddress, carolAddress],
      });
      let carolFinalRewardsInfo = context.pairs[0].storage.user_rewards[
        carolAddress
      ] || {
        reward: new BigNumber(0),
        reward_paid: new BigNumber(0),
        loyalty: new BigNumber(0),
        loyalty_paid: new BigNumber(0),
      };

      ok(
        bobFinalRewardsInfo.reward
          .plus(aliceFinalRewardsInfo.reward)
          .plus(carolFinalRewardsInfo.reward)
          .gt(new BigNumber(reward * 0.99 * 1e15)),
        "Total reward is too small"
      );
      ok(
        bobFinalRewardsInfo.reward
          .plus(aliceFinalRewardsInfo.reward)
          .plus(carolFinalRewardsInfo.reward)
          .lte(new BigNumber(reward * (i + 1) * 1e15)),
        "Total reward is too big"
      );
    }
  });
});
