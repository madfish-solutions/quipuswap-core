import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";

// 133.036
// ->
// 315.984

contract("DivestLiquidity()", function () {
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
  const burntShares: number = 200;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(1, "tez_to_token");
    await context.setDexFactoryFunction(2, "token_to_tez");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    pairAddress = await context.createPair();
    tokenAddress = await context.pairs[0].contract.address;
  });

  describe("Test if the diivestment is allowed", () => {
    const initToken = 1000000;
    const initTez = 10000;

    it("revert in case no liquidity is provided", async function () {
      await context.pairs[0].divestLiquidity(1, 1, initTez);
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
        initTez - burntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initTez - burntShares,
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

  describe("Test various burnt shares", () => {
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
        context.pairs[0].divestLiquidity(1, 1, 20000),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case of burnt shares of 1", async function () {
      const minBurntShares = 10;
      const minReceivedTezAmount: number = 10;
      const minReceivedTokenAmount: number = 1000;
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const initialStorage = await context.pairs[0].storage;
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
        initialStorage.ledger[aliceAddress].balance.toNumber() - minBurntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() - minBurntShares,
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

    it("success in case the medium burnt shares", async function () {
      const minBurntShares = 100;
      const minReceivedTezAmount: number = 100;
      const minReceivedTokenAmount: number = 10000;
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const initialStorage = await context.pairs[0].storage;
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
        initialStorage.ledger[aliceAddress].balance.toNumber() - minBurntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() - minBurntShares,
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

    it("success in case of exact burnt shares", async function () {
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const initialStorage = await context.pairs[0].storage;
      const minBurntShares = initialStorage.ledger[
        aliceAddress
      ].balance.toNumber();
      const minReceivedTezAmount: number = minBurntShares;
      const minReceivedTokenAmount: number = minBurntShares * 100;
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
        0,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        0,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[0].storage.tez_pool.toNumber(),
        0,
        "Tez pool should be decremented by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.token_pool.toNumber(),
        0,
        "Token pool should be decremented  by sent amount"
      );
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        0,
        "Inveriant should be calculated properly"
      );
    });
  });

  describe("Test calculated received amount", () => {
    it("revert in case of calculated tez are zero", async function () {
      const initToken = 1000000;
      const initTez = 100;
      const share = 1;
      await context.pairs[0].initializeExchange(initToken, initTez);
      await context.pairs[0].tokenToTezPayment(100000, 1, bobAddress);
      await rejects(
        context.pairs[0].divestLiquidity(1, 1, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of calculated tokens are zero", async function () {
      const initTez = 1000000;
      const initToken = 100;
      await context.pairs[0].divestLiquidity(1, 1, initToken);
      await context.pairs[0].initializeExchange(initToken, initTez);
      await context.pairs[0].tezToTokenPayment(1, 100000, bobAddress);
      const share = 1;
      await rejects(
        context.pairs[0].divestLiquidity(1, 1, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });
  });

  describe("Test expected amount when", () => {
    before(async () => {
      const initTez = 1000000;
      const initToken = 100;
      await context.pairs[0].divestLiquidity(1, 1, initTez);
      await context.pairs[0].initializeExchange(initToken, initTez);
    });

    it("revert in case of expected tez are higher", async function () {
      const share = 100;
      await rejects(
        context.pairs[0].divestLiquidity(1, 100000000, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of expected tokens are higher", async function () {
      const share = 100;
      await rejects(
        context.pairs[0].divestLiquidity(100000000, 1, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of expected tokens are 0", async function () {
      const share = 1;
      await rejects(
        context.pairs[0].divestLiquidity(0, 1, share),
        (err) => {
          ok(err.message == "Dex/dust-output", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("revert in case of expected tez are 0", async function () {
      const share = 1;
      await rejects(
        context.pairs[0].divestLiquidity(1, 0, share),
        (err) => {
          ok(err.message == "Dex/dust-output", "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });

    it("success in case the of the expected amount smaller than calculated", async function () {
      const expectedTez = 100000;
      const expectedToken = 10;
      const minBurntShares = 500000;
      const minReceivedTezAmount: number = 500000;
      const minReceivedTokenAmount: number = 50;
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].divestLiquidity(
        expectedToken,
        expectedTez,
        minBurntShares
      );
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
        initialStorage.ledger[aliceAddress].balance.toNumber() - minBurntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() - minBurntShares,
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

    it("success in case the of the exact expected tez and tokens", async function () {
      const minBurntShares = 500000;
      const minReceivedTezAmount: number = 500000;
      const minReceivedTokenAmount: number = 50;
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const initialStorage = await context.pairs[0].storage;
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].divestLiquidity(
        minReceivedTokenAmount,
        minReceivedTezAmount,
        minBurntShares
      );
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
        initialStorage.ledger[aliceAddress].balance.toNumber() - minBurntShares,
        "Alice should burn the shares"
      );
      strictEqual(
        context.pairs[0].storage.total_supply.toNumber(),
        initialStorage.total_supply.toNumber() - minBurntShares,
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
  });
});
