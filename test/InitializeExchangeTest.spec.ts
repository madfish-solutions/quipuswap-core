import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";

contract("InitializeExchange()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([], true, "alice", false);
  });

  it("should initialize & deploy 1 exchange and set initial stage", async function () {
    // ensure no token pairs added
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.token_list.length,
      0,
      "Factory tokenList should be empty"
    );

    // create token
    let tokenAddress = await context.createToken();
    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // store user & pair prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    let aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
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
    let aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({
      ledger: [aliceAddress, pairAddress],
    });
    let aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    let pairTezBalance = await tezos.tz.getBalance(pairAddress);

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
      context.factory.storage.token_list.length,
      1,
      "Factory tokenList should contain 1 entity"
    );
    notStrictEqual(
      context.factory.storage.token_to_exchange[
        context.factory.storage.token_list[0]
      ],
      null,
      "Factory token_to_exchange should contain DexPair contract address"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
      1000,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.total_supply.toNumber(),
      1000,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tez_pool.toNumber(),
      tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.token_pool.toNumber(),
      tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      tokenAmount * tezAmount,
      "Inveriant should be calculated properly"
    );
    strictEqual(
      context.pairs[0].storage.token_address,
      tokenAddress,
      "Token address should match the created token"
    );
  });

  it("should initialize existing pair if there are no shares", async function () {
    let tezAmount = 10000;
    let tokenAmount = 1000000;

    // ensure pair added
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.token_list.length,
      1,
      "Factory tokenList should contain 1 exchange"
    );

    // withdraw all liquidity
    await context.pairs[0].divestLiquidity(1, 1, 1000);

    // store user & pair prev balances
    let tokenAddress = context.tokens[0].contract.address;
    let pairAddress = context.pairs[0].contract.address;
    let aliceAddress = await tezos.signer.publicKeyHash();
    let aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
    let aliceInitTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    // initialize exchange
    await context.pairs[0].initializeExchange(tokenAmount, tezAmount);

    // checks:

    let aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
    await context.tokens[0].updateStorage({
      ledger: [aliceAddress, pairAddress],
    });
    let aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
      aliceAddress
    ].balance;

    let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
      .balance;
    let pairTezBalance = await tezos.tz.getBalance(pairAddress);

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
      context.factory.storage.token_list.length,
      1,
      "Factory tokenList should contain 1 entity"
    );
    notStrictEqual(
      context.factory.storage.token_to_exchange[
        context.factory.storage.token_list[0]
      ],
      null,
      "Factory token_to_exchange should contain DexPair contract address"
    );

    // 3. new pair state
    await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
    strictEqual(
      context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
      1000,
      "Alice should receive 1000 shares"
    );
    strictEqual(
      context.pairs[0].storage.total_supply.toNumber(),
      1000,
      "Alice tokens should be all supply"
    );
    strictEqual(
      context.pairs[0].storage.tez_pool.toNumber(),
      tezAmount,
      "Tez pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.token_pool.toNumber(),
      tokenAmount,
      "Token pool should be fully funded by sent amount"
    );
    strictEqual(
      context.pairs[0].storage.invariant.toNumber(),
      tokenAmount * tezAmount,
      "Inveriant should be calculated properly"
    );
    strictEqual(
      context.pairs[0].storage.token_address,
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
      context.factory.storage.token_list.length,
      1,
      "Factory tokenList should contain 1 exchange"
    );

    // ensure attempt to add the pair again fails Factory/exchange-launched
    let tokenAddress = context.factory.storage.token_list[0];
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
