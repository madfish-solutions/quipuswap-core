import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract("InitializeExchange()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([], true, "alice", false);
  });

  it("should initialize & deploy 1 exchange and set initial stage", async function () {
    // ensure no token pairs added
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.tokenList.length,
      0,
      "Factory tokenList should be empty"
    );

    // create token
    let tokenAddress = await context.createToken();
    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // store user & pair prev balances
    let aliceAddress = await Tezos.signer.publicKeyHash();
    let aliceInitTezBalance = await Tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
    let aliceInitTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    // add new exchange pair
    let pairAddress = await context.createPair({
      tokenAddress,
      tezAmount,
      tokenAmount,
    });

    // checks:

    // 1.1 tokens/tez withdrawn
    let aliceFinalTezBalance = await Tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({
      ledger: [aliceAddress, pairAddress],
    });
    let aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    let pairTezBalance = await Tezos.tz.getBalance(pairAddress);

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

    // 1.2 tokens/tez send to token pair
    strictEqual(
      pairTokenBalance.toNumber(),
      tokenAmount,
      "Tokens not received"
    );
    strictEqual(pairTezBalance.toNumber(), tezAmount, "Tez not received");

    // 2. factory state
    strictEqual(
      context.factory.storage.tokenList.length,
      1,
      "Factory tokenList should contain 1 entity"
    );
    notStrictEqual(
      context.factory.storage.tokenToExchange[
        context.factory.storage.tokenList[0]
      ],
      null,
      "Factory tokenToExchange should contain DexPair contract address"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
      1000,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.totalSupply.toNumber(),
      1000,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tezPool.toNumber(),
      tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.tokenPool.toNumber(),
      tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      tokenAmount * tezAmount,
      "Inveriant should be calculated properly"
    );
    strictEqual(
      context.pairs[0].storage.tokenAddress,
      tokenAddress,
      "Token address should match the created token"
    );
  });

  it.skip("should initialize & deploy a 10 of exchanges and set initial state", async function () {
    this.timeout(500000);

    // generate configs
    let exchangeCount = 10;
    let configs = [];
    for (let i = 0; i < exchangeCount; i++) {
      configs.push({
        tezAmount: 20 * (exchangeCount - i),
        tokenAmount: 30000 * (i + 1),
      });
    }

    // create context with 10 exchanges
    let context = await Context.init(configs, false);

    // ensure factory registered 10 exchanges
    await context.factory.updateStorage({
      tokenToExchange: context.factory.storage.tokenList,
    });
    strictEqual(
      context.factory.storage.tokenList.length,
      exchangeCount,
      "Factory tokenList should be empty"
    );

    let aliceAddress = await Tezos.signer.publicKeyHash();

    // check each exchange pair state
    for (let i = 0; i < exchangeCount; i++) {
      await context.pairs[i].updateStorage({ ledger: [aliceAddress] });
      strictEqual(
        context.pairs[i].storage.ledger[aliceAddress].balance.toNumber(),
        1000,
        "Alice should receive 1000 shares"
      );
      strictEqual(
        context.pairs[i].storage.totalSupply.toNumber(),
        1000,
        "Alice tokens should be all supply"
      );
      strictEqual(
        context.pairs[i].storage.tezPool.toNumber(),
        configs[i].tezAmount,
        "Tez pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[i].storage.tokenPool.toNumber(),
        configs[i].tokenAmount,
        "Token pool should be fully funded by sent amount"
      );
      strictEqual(
        context.pairs[i].storage.invariant.toNumber(),
        configs[i].tokenAmount * configs[i].tezAmount,
        "Inveriant should be calculated properly"
      );
    }
  });

  it("should initialize existing pair if there are no shares", async function () {
    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // ensure pair added
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.tokenList.length,
      1,
      "Factory tokenList should contain 1 exchange"
    );

    // withdraw all liquidity
    await context.pairs[0].divestLiquidity(1, 1, 1000);

    // store user & pair prev balances
    let tokenAddress = context.tokens[0].contract.address;
    let pairAddress = context.pairs[0].contract.address;
    let aliceAddress = await Tezos.signer.publicKeyHash();
    let aliceInitTezBalance = await Tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
    let aliceInitTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    // initialize exchange
    await context.pairs[0].initializeExchange(tokenAmount, tezAmount);

    // checks:

    let aliceFinalTezBalance = await Tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({
      ledger: [aliceAddress, pairAddress],
    });
    let aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    let pairTezBalance = await Tezos.tz.getBalance(pairAddress);

    // 1.1 tokens/tez withdrawn
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

    // 1.2 tokens/tez send to token pair
    strictEqual(
      pairTokenBalance.toNumber(),
      tokenAmount,
      "Tokens not received"
    );
    strictEqual(pairTezBalance.toNumber(), tezAmount, "Tez not received");

    // 2. factory state
    strictEqual(
      context.factory.storage.tokenList.length,
      1,
      "Factory tokenList should contain 1 entity"
    );
    notStrictEqual(
      context.factory.storage.tokenToExchange[
        context.factory.storage.tokenList[0]
      ],
      null,
      "Factory tokenToExchange should contain DexPair contract address"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
      1000,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.totalSupply.toNumber(),
      1000,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tezPool.toNumber(),
      tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.tokenPool.toNumber(),
      tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      tokenAmount * tezAmount,
      "Inveriant should be calculated properly"
    );
    strictEqual(
      context.pairs[0].storage.tokenAddress,
      tokenAddress,
      "Token address should match the created token"
    );
  });

  it("should fail initialization & deployment if exchange pair exist", async function () {
    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // ensure pair added
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.tokenList.length,
      1,
      "Factory tokenList should contain 1 exchange"
    );

    // ensure attempt to add the pair again fails Factory/exchange-launched
    let tokenAddress = context.factory.storage.tokenList[0];
    await rejects(
      context.createPair({
        tokenAddress,
        tezAmount,
        tokenAmount,
      }),
      (err) => {
        strictEqual(
          err.message,
          "Factory/exchange-launched",
          "Error message mismatch"
        );
        return true;
      },
      "Adding Dex should fail"
    );
  });

  it("should fail initialization & deployment if no tokens are sent", async function () {
    // create token
    let tokenAddress = await context.createToken();
    let tezAmount = 10000;
    let tokenAmount = 0;

    // add new exchange pair
    await rejects(
      context.createPair({
        tokenAddress,
        tezAmount,
        tokenAmount,
      }),
      (err) => {
        strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
        return true;
      },
      "Adding Dex should fail"
    );
  });

  it("should fail initialization & deployment if no tez are sent", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // create token
    let tokenAddress = await context.createToken();
    let tezAmount = 0;
    let tokenAmount = 1000000;

    // add new exchange pair
    await rejects(
      context.createPair({
        tokenAddress,
        tezAmount,
        tokenAmount,
      }),
      (err) => {
        strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
        return true;
      },
      "Adding Dex should fail"
    );
  });

  it("should fail initialization if no tokens are sent", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // ensure pair added
    await context.factory.updateStorage();
    // strictEqual(
    //   context.factory.storage.tokenList.length,
    //   1,
    //   "Factory tokenList should contain 1 exchange"
    // );

    // withdraw all liquidity
    await context.pairs[0].divestLiquidity(1, 1, 1000);

    // attempt to initialize exchange
    await rejects(
      context.pairs[0].initializeExchange(0, tezAmount),
      (err) => {
        strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
        return true;
      },
      "Initializing Dex should fail"
    );
  });

  it("should fail initialization if no tez are sent", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // ensure pair added
    await context.factory.updateStorage();
    // strictEqual(
    //   context.factory.storage.tokenList.length,
    //   1,
    //   "Factory tokenList should contain 1 exchange"
    // );

    // withdraw all liquidity
    await context.pairs[0].divestLiquidity(1, 1, 1000);

    // attempt to initialize exchange
    await rejects(
      context.pairs[0].initializeExchange(tokenAmount, 0),
      (err) => {
        strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
        return true;
      },
      "Initializing Dex should fail"
    );
  });
});
