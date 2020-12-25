import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import accounts from "./accounts/accounts";
import { defaultAccountInfo, initialSharesCount } from "./constants";

// 142.995 (5 tests)
// ->
// 183.648 (9 tests)

contract("InvestLiquidity()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const tezAmount: number = 1000;
  const tokenAmount: number = 100000;
  const newShares: number = 100;

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
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares),
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
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);
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
        initToken + tokenAmount,
        "Tokens not received"
      );
      strictEqual(
        pairTezBalance.toNumber(),
        initTez + tezAmount,
        "Tez not received"
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        initialSharesCount + newShares,
        "Alice should receive 1000 shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialSharesCount + newShares,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        initTez + tezAmount,
        "Tez pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        initToken + tokenAmount,
        "Token pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        (initToken + tokenAmount) * (initTez + tezAmount),
        "Inveriant should be calculated properly"
      );
    });
  });

  describe("Test various min shared", () => {
    before(async () => {});

    it("revert in case of 0 min shares", async function () {
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, 0),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of too high expected min shares", async function () {
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares * 2),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case of min shares of 1", async function () {
      await context.pairs[0].updateStorage();
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, 1);
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
        "Alice should receive 1100 shares"
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

    it("success in case of exact min shares", async function () {
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

    it("success in case of medium min shares", async function () {
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
  });

  describe("Test purchased shares", () => {
    before(async () => {});

    it("revert in case of 0 purchased shares", async function () {
      await rejects(
        context.pairs[0].investLiquidity(100, 1, 1),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case of more then 0 tokens purchesed", async function () {
      await context.pairs[0].updateStorage();
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);
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
  });
});
