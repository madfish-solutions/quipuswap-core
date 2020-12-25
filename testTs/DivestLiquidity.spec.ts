import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo, initialSharesCount } from "./constants";

// 133.036
contract.only("DivestLiquidity()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const tezAmount: number = 1000;
  const tokenAmount: number = 100000;
  const receivedTezAmount: number = 200;
  const receivedTokenAmount: number = 20000;
  const newShares: number = 100;
  const burntShares: number = 20;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    pairAddress = await context.createPair();
    tokenAddress = await context.pairs[0].contract.address;
  });

  describe("Test if the investment is allowed", () => {
    const initToken = 1000000;
    const initTez = 10000;

    before(async () => {});

    it("revert in case no liquidity is provided", async function () {
      await context.pairs[0].divestLiquidity(0, 1, initialSharesCount);
      await rejects(
        context.pairs[0].divestLiquidity(1, 1, burntShares),
        (err) => {
          ok(err.message == "Dex/not-launched", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case the exchange is launched", async function () {
      await context.pairs[0].initializeExchange(initToken, initTez);
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].divestLiquidity(1, 1, burntShares);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);
      strictEqual(
        aliceInitTokenBalance.toNumber() + receivedTokenAmount,
        aliceFinalTokenBalance.toNumber(),
        "Tokens not received"
      );
      ok(
        aliceInitTezBalance.toNumber() + receivedTezAmount >=
          aliceFinalTezBalance.toNumber(),
        "Tez not received"
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        initToken - receivedTokenAmount,
        "Tokens not sent"
      );
      strictEqual(
        pairTezBalance.toNumber(),
        initTez - receivedTezAmount,
        "Tez not sent"
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        initialSharesCount - burntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialSharesCount - burntShares,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        initTez - receivedTezAmount,
        "Tez pool should be decremented by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        initToken - receivedTokenAmount,
        "Token pool should be decremented funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        (initToken - receivedTokenAmount) * (initTez - receivedTezAmount),
        "Inveriant should be calculated properly"
      );
    });
  });

  describe("Test various burnt shared", () => {
    before(async () => {});

    it("revert in case of 0 burnt shares", async function () {
      await rejects(
        context.pairs[0].divestLiquidity(1, 1, 0),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of too high expected burnt shares", async function () {
      await rejects(
        context.pairs[0].divestLiquidity(1, 1, initialSharesCount * 2),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case of burnt shares of 1", async function () {
      const minBurntShares = 1;
      const minReceivedTezAmount: number = 10;
      const minReceivedTokenAmount: number = 1000;
      const initialStorage = await context.pairs[0].storage;
      await context.pairs[0].updateStorage();
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].divestLiquidity(1, 1, minBurntShares);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);
      strictEqual(
        aliceInitTokenBalance.toNumber() + minReceivedTokenAmount,
        aliceFinalTokenBalance.toNumber(),
        "Tokens not received"
      );
      ok(
        aliceInitTezBalance.toNumber() + minReceivedTezAmount >=
          aliceFinalTezBalance.toNumber(),
        "Tez not received"
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        initialStorage.token_pool.toNumber() - minReceivedTokenAmount,
        "Tokens not sent"
      );
      strictEqual(
        pairTezBalance.toNumber(),
        initialStorage.tez_pool.toNumber() - minReceivedTezAmount,
        "Tez not sent"
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        initialSharesCount - minBurntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialSharesCount - minBurntShares,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        initialStorage.tez_pool.toNumber() - minReceivedTezAmount,
        "Tez pool should be decremented by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        initialStorage.token_pool.toNumber() - minReceivedTokenAmount,
        "Token pool should be decremented funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        (initialStorage.token_pool.toNumber() - minReceivedTokenAmount) *
          (initialStorage.tez_pool.toNumber() - minReceivedTezAmount),
        "Inveriant should be calculated properly"
      );
    });

    it.skip("success in case the medium burnt shares", async function () {
      await context.pairs[0].updateStorage();
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, 50);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);
      strictEqual(
        aliceInitTokenBalance.toNumber() - tokenAmount,
        aliceFinalTokenBalance.toNumber(),
        "Tokens not sent"
      );
      ok(
        aliceInitTezBalance.toNumber() - tezAmount >=
          aliceFinalTezBalance.toNumber(),
        "Tez not sent"
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        initialStorage.token_pool.toNumber() + tokenAmount,
        "Tokens not received"
      );
      strictEqual(
        pairTezBalance.toNumber(),
        initialStorage.tez_pool.toNumber() + tezAmount,
        "Tez not received"
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        initialStorage.total_supply.toNumber() + newShares,
        "Alice should receive 1000 shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() + newShares,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        initialStorage.tez_pool.toNumber() + tezAmount,
        "Tez pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        initialStorage.token_pool.toNumber() + tokenAmount,
        "Token pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        (initialStorage.token_pool.toNumber() + tokenAmount) *
          (initialStorage.tez_pool.toNumber() + tezAmount),
        "Inveriant should be calculated properly"
      );
    });

    it.skip("success in case of exact burnt shares", async function () {
      await context.pairs[0].updateStorage();
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, 100);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);
      strictEqual(
        aliceInitTokenBalance.toNumber() - tokenAmount,
        aliceFinalTokenBalance.toNumber(),
        "Tokens not sent"
      );
      ok(
        aliceInitTezBalance.toNumber() - tezAmount >=
          aliceFinalTezBalance.toNumber(),
        "Tez not sent"
      );
      strictEqual(
        pairTokenBalance.toNumber(),
        initialStorage.token_pool.toNumber() + tokenAmount,
        "Tokens not received"
      );
      strictEqual(
        pairTezBalance.toNumber(),
        initialStorage.tez_pool.toNumber() + tezAmount,
        "Tez not received"
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        initialStorage.total_supply.toNumber() + newShares,
        "Alice should receive 1200 shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() + newShares,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        initialStorage.tez_pool.toNumber() + tezAmount,
        "Tez pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        initialStorage.token_pool.toNumber() + tokenAmount,
        "Token pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        (initialStorage.token_pool.toNumber() + tokenAmount) *
          (initialStorage.tez_pool.toNumber() + tezAmount),
        "Inveriant should be calculated properly"
      );
    });
  });

  it.skip("should revert divestment if not enough shares to burn", async function () {
    this.timeout(5000000);

    let tezAmount = 10000;
    let tokenAmount = 1000000;
    let sharesBurned = 10001;

    // attempt to invest liquidity
    await rejects(
      context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Investment to Dex should revert"
    );
  });

  it.skip("should revert divestment if required shares to burn is zero", async function () {
    this.timeout(5000000);

    let tezAmount = 1000;
    let tokenAmount = 100000;
    let sharesBurned = 0;

    // attempt to invest liquidity
    await rejects(
      context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Investment to Dex should revert"
    );
  });
});
