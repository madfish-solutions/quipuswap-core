import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";

contract("InitializeExchange()", function () {
  let context: Context;
  let aliceAddress: string = accounts.alice.pkh;
  const tezAmount: number = 10000;
  const tokenAmount: number = 1000;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(5, "divest_liquidity");
  });

  it("should have an empty token list after deployment", async function () {
    await context.factory.updateStorage();
    strictEqual(context.factory.storage.token_list.length, 0);
  });

  describe("Test initialize during the deployment", () => {
    let tokenAddress: string;
    before(async () => {
      tokenAddress = await context.createToken();
    });

    it("revert in case the amount of tokens isn't approved", async function () {
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
        }
      );
    });

    it("revert in case the amount of XTZ is zero", async function () {
      await rejects(
        context.createPair({
          tokenAddress,
          tezAmount: 0,
          tokenAmount,
        }),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case the amount of tokens is zero", async function () {
      await rejects(
        context.createPair({
          tokenAddress,
          tezAmount,
          tokenAmount: 0,
        }),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        }
      );
    });

    it("success in case the pair doesn't exist", async function () {
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairAddress = await context.createPair({
        tokenAddress,
        tezAmount,
        tokenAmount,
      });
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);

      strictEqual(
        aliceInitTokenBalance.toNumber() - tokenAmount,
        aliceFinalTokenBalance.toNumber()
      );
      ok(
        aliceInitTezBalance.toNumber() - tezAmount >=
          aliceFinalTezBalance.toNumber()
      );
      strictEqual(pairTokenBalance.toNumber(), tokenAmount);
      strictEqual(pairTezBalance.toNumber(), tezAmount);
      strictEqual(context.factory.storage.token_list.length, 1);
      notStrictEqual(
        context.factory.storage.token_to_exchange[
          context.factory.storage.token_list[0]
        ],
        null
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        tezAmount
      );
      strictEqual(context.pairs[0].storage.total_supply.toNumber(), tezAmount);
      strictEqual(context.pairs[0].storage.tez_pool.toNumber(), tezAmount);
      strictEqual(context.pairs[0].storage.token_pool.toNumber(), tokenAmount);
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        tokenAmount * tezAmount
      );
      strictEqual(context.pairs[0].storage.token_address, tokenAddress);
    });

    it("revert in case the pair exists", async function () {
      const tokenAddress = context.factory.storage.token_list[0];
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
        }
      );
    });
  });

  describe("Test initialize after liquidity withdrawn when", () => {
    it("revert in case liquidity isn't zero", async function () {
      await rejects(
        context.pairs[0].initializeExchange(tokenAmount, tezAmount),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case the amount of tokens isn't approved", async function () {
      await context.pairs[0].divestLiquidity(1, 1, tezAmount);
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
        }
      );
    });

    it("success in case liquidity is zero", async function () {
      const tokenAddress = context.tokens[0].contract.address;
      const pairAddress = context.pairs[0].contract.address;
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTezBalance = await tezos.tz.getBalance(aliceAddress);
      const aliceInitTokenBalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.pairs[0].initializeExchange(tokenAmount, tezAmount);
      const aliceFinalTezBalance = await tezos.tz.getBalance(aliceAddress);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.pairs[0].updateStorage({ ledger: [aliceAddress] });
      const aliceFinalTokenBalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenBalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTezBalance = await tezos.tz.getBalance(pairAddress);

      strictEqual(
        aliceInitTokenBalance.toNumber() - tokenAmount,
        aliceFinalTokenBalance.toNumber()
      );
      ok(
        aliceInitTezBalance.toNumber() - tezAmount >=
          aliceFinalTezBalance.toNumber()
      );
      strictEqual(pairTokenBalance.toNumber(), tokenAmount);
      strictEqual(pairTezBalance.toNumber(), tezAmount);
      strictEqual(context.factory.storage.token_list.length, 1);
      notStrictEqual(
        context.factory.storage.token_to_exchange[
          context.factory.storage.token_list[0]
        ],
        null
      );
      strictEqual(
        context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(),
        tezAmount
      );
      strictEqual(context.pairs[0].storage.total_supply.toNumber(), tezAmount);
      strictEqual(context.pairs[0].storage.tez_pool.toNumber(), tezAmount);
      strictEqual(context.pairs[0].storage.token_pool.toNumber(), tokenAmount);
      strictEqual(
        context.pairs[0].storage.invariant.toNumber(),
        tokenAmount * tezAmount
      );
      strictEqual(context.pairs[0].storage.token_address, tokenAddress);
    });

    it("revert in case the amount of token is zero", async function () {
      await rejects(
        context.pairs[0].initializeExchange(0, tezAmount),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case the amount of XTZ is zero", async function () {
      await rejects(
        context.pairs[0].initializeExchange(tokenAmount, 0),
        (err) => {
          strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
          return true;
        }
      );
    });
  });
});
