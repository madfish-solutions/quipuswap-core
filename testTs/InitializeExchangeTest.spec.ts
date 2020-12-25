import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import { BigNumber } from "bignumber.js";

const defaultAccountTnfo = {
  balance: new BigNumber(0),
  frozen_balance: new BigNumber(0),
  allowances: {},
};

// 275.851s
// ->
// 133.092s

contract("InitializeExchange()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(5, "divest_liquidity");
  });

  it("should have an empty token list after deployment", async function () {
    await context.factory.updateStorage();
    strictEqual(
      context.factory.storage.token_list.length,
      0,
      "Factory token_list should be empty"
    );
  });

  describe("Test initialize during the deployment", () => {
    let tokenAddress: string;
    before(async () => {
      tokenAddress = await context.createToken();
    });

    it("fail if the amount of tokens isn't approved", async function () {
      // create token
      let tezAmount = 10000;
      let tokenAmount = 1000;

      // add new exchange pair
      await rejects(
        context.factory.launchExchange(
          tokenAddress,
          tokenAmount,
          tezAmount,
          false
        ),
        (err) => {
          ok(
            err.message == "FA2_NOT_OPERATOR" ||
              err.message == "NotEnoughAllowance",
            "Error message mismatch"
          );
          return true;
        },
        "Adding Dex should fail"
      );
    });

    it("fail if the amount of XTZ is zero", async function () {
      // create token
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

    it("fail if the amount of tokens is zero", async function () {
      // create token
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

    it("success if the pair doesn't exist", async function () {
      // create token
      let tezAmount = 10000;
      let tokenAmount = 1000000;

      // store user & pair prev balances
      let aliceAddress = await tezos.signer.publicKeyHash();
      let aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      let aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountTnfo
      ).balance;

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

    it("fail if the pair exists", async function () {
      let tezAmount = 10000;
      let tokenAmount = 1000000;

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
  });

  describe("Test initialize after liquidity withdrawn when", () => {
    it("fail if liquidity isn't zero", async function () {
      let tezAmount = 10000;
      let tokenAmount = 1000000;

      await rejects(
        context.pairs[0].initializeExchange(tokenAmount, tezAmount),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        },
        "Adding Dex should fail"
      );
    });

    it("fail if the amount of tokens isn't approved", async function () {
      // create token
      let tezAmount = 1000;
      let tokenAmount = 10000000;

      // withdraw all liquidity
      await context.pairs[0].divestLiquidity(0, 1, 1000);

      // add new exchange pair
      await context.pairs[0].approveToken(0, context.pairs[0].contract.address);
      await rejects(
        context.pairs[0].initializeExchange(tokenAmount, tezAmount, false),
        (err) => {
          ok(
            err.message == "FA2_NOT_OPERATOR" ||
              err.message == "NotEnoughAllowance",
            "Error message mismatch"
          );
          return true;
        },
        "Adding Dex should fail"
      );
    });

    it("success if liquidity is zero", async function () {
      let tezAmount = 10000;
      let tokenAmount = 1000000;

      // store user & pair prev balances
      let tokenAddress = context.tokens[0].contract.address;
      let pairAddress = context.pairs[0].contract.address;
      let aliceAddress = await tezos.signer.publicKeyHash();
      let aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      let aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountTnfo
      ).balance;

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

    it("fail if the amount of token is zero", async function () {
      let tezAmount = 10000;

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

    it("fail if the amount of XTZ is zero", async function () {
      let tokenAmount = 1000000;

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
});
