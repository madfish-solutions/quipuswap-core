import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import accounts from "./accounts/accounts";
import { defaultAccountInfo, initialSharesCount } from "./constants";

//  142.995 (5 tests)
contract.only("InvestLiquidity()", function () {
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

    it("fail in case no liquidity is provided", async function () {
      await context.pairs[0].divestLiquidity(0, 1, initialSharesCount);
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares),
        (err) => {
          ok(err.message == "Dex/not-launched", "Error message mismatch");
          return true;
        },
        "Investment should fail"
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
    const initToken = 1000000;
    const initTez = 10000;

    before(async () => {});

    it("fail in case of 0 min shares", async function () {
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, 0),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should fail"
      );
    });

    it("fail in case of too high expected min shares", async function () {
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares * 2),
        (err) => {
          ok(err.message == "Dex/wrong-params", "Error message mismatch");
          return true;
        },
        "Investment should fail"
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

    it("success in case the exchange is launched", async function () {
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

  it.skip("should invest liquidity and distribute new shares by current provider", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    const tezAmount = 1000;
    const tokenAmount = 100000;
    const newShares = 100;

    // store prev balances
    const pairAddress = context.pairs[0].contract.address;
    const aliceAddress = await tezos.signer.publicKeyHash();
    const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
    const aliceInitTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    // invest liquidity
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // checks
    const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({
      ledger: [aliceAddress, pairAddress],
    });
    const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    const pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    const pairTezBalance = await tezos.tz.getBalance(pairAddress);

    // 1. tokens/tez withdrawn
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

    // 2. tokens/tez send to token pair
    strictEqual(
      pairTokenBalance.toNumber(),
      1000000 + tokenAmount,
      "Tokens not received"
    );
    strictEqual(
      pairTezBalance.toNumber(),
      10000 + tezAmount,
      "Tez not received"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
      1000 + newShares,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.total_supply.toNumber(),
      1000 + newShares,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tez_pool.toNumber(),
      10000 + tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.token_pool.toNumber(),
      1000000 + tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      (1000000 + tokenAmount) * (10000 + tezAmount),
      "Inveriant should be calculated properly"
    );
  });

  it.skip("should invest liquidity and destribute new shares by new provider", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    const tezAmount = 1000;
    const tokenAmount = 100000;
    const newShares = 100;

    const pairAddress = context.pairs[0].contract.address;
    const aliceAddress = await tezos.signer.publicKeyHash();

    // update keys
    await context.updateActor("bob");
    const bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    // send tokens to bob
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);
    await context.updateActor("bob");

    // store prev balances
    const bobInitTezBalance = await tezos.tz.getBalance(bobAddress);
    await context.tokens[0].updateStorage({ ledger: [bobAddress] });
    const bobInitTokenBalance = await context.tokens[0].storage.ledger[
      bobAddress
    ].balance;
    // invest liquidity
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    // checks
    const bobFinalTezBalance = await tezos.tz.getBalance(bobAddress);
    await context.tokens[0].updateStorage({
      ledger: [bobAddress, pairAddress],
    });
    const bobFinalTokenBalance = await context.tokens[0].storage.ledger[
      bobAddress
    ].balance;

    const pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    const pairTezBalance = await tezos.tz.getBalance(pairAddress);

    // 1. tokens/tez withdrawn
    strictEqual(
      bobInitTokenBalance.toNumber() - tokenAmount,
      bobFinalTokenBalance.toNumber(),
      "Tokens not sent"
    );
    ok(
      bobInitTezBalance.toNumber() - tezAmount >= bobFinalTezBalance.toNumber(),
      "Tez not sent"
    );

    // 2. tokens/tez send to token pair
    strictEqual(
      pairTokenBalance.toNumber(),
      1000000 + tokenAmount,
      "Tokens not received"
    );
    strictEqual(
      pairTezBalance.toNumber(),
      10000 + tezAmount,
      "Tez not received"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [bobAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[bobAddress].balance.toNumber(),
      newShares,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.total_supply.toNumber(),
      1000 + newShares,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tez_pool.toNumber(),
      10000 + tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.token_pool.toNumber(),
      1000000 + tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      (1000000 + tokenAmount) * (10000 + tezAmount),
      "Inveriant should be calculated properly"
    );
  });

  it.skip("should fail investment if min shares are too high", async function () {
    const tezAmount = 100;
    const tokenAmount = 100000;
    const newShares = 11;

    // attempt to invest liquidity
    await rejects(
      context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Investment to Dex should fail"
    );
  });

  it.skip("should fail investment if too little tez are sent", async function () {
    const tezAmount = 1;
    const tokenAmount = 100000;
    const newShares = 11;

    // attempt to invest liquidity
    await rejects(
      context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares),
      (err) => {
        strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
        return true;
      },
      "Investment to Dex should fail"
    );
  });

  if (process.env.npm_package_config_standard === "FA12") {
    it("should fail investment if too little tokens are sent", async function () {
      // reset pairs
      await context.flushPairs();
      await context.createPairs();

      const tezAmount = 100;
      const tokenAmount = 1000;
      const newShares = 10;

      // attempt to invest liquidity
      await rejects(
        context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares),
        (err) => {
          strictEqual(
            err.message,
            "NotEnoughAllowance",
            "Error message mismatch"
          );
          return true;
        },
        "Investment to Dex should fail"
      );
    });
  }
});
