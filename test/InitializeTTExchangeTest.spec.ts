import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";

contract("InitializeTTExchange()", function () {
  let context: TTContext;
  let aliceAddress: string = accounts.alice.pkh;
  const tokenAAmount: number = 10000;
  const tokenBAmount: number = 1000;

  before(async () => {
    context = await TTContext.init([], false, "alice", false);
    await context.setDexFunction(0, "initialize_exchange");
    await context.setDexFunction(3, "divest_liquidity");
  });

  it("should have an empty token list after deployment", async function () {
    await context.dex.updateStorage();
    strictEqual(context.dex.storage.pairs_count.toString(), "0");
  });

  describe("Test initialize in the first time", () => {
    let tokenAAddress: string;
    let tokenBAddress: string;
    before(async () => {
      tokenAAddress = await context.createToken();
      tokenBAddress = await context.createToken();
      if (tokenAAddress > tokenBAddress) {
        const tmp = context.tokens[0];
        context.tokens[0] = context.tokens[1];
        context.tokens[1] = tmp;
        tokenAAddress = context.tokens[0].contract.address;
        tokenBAddress = context.tokens[1].contract.address;
      }
    });

    it("revert in case the amount of one of A tokens is zero", async function () {
      await rejects(
        context.createPair({
          tokenAAddress,
          tokenBAddress,
          tokenAAmount: 0,
          tokenBAmount,
        }),
        (err) => {
          strictEqual(err.message, "Dex/no-token-a", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case the amount of token B is zero", async function () {
      await rejects(
        context.createPair({
          tokenAAddress,
          tokenBAddress,
          tokenAAmount,
          tokenBAmount: 0,
        }),
        (err) => {
          strictEqual(err.message, "Dex/no-token-b", "Error message mismatch");
          return true;
        }
      );
    });

    it("success in case the pair doesn't exist", async function () {
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[1].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.createPair({
        tokenAAddress,
        tokenBAddress,
        tokenAAmount,
        tokenBAmount,
      });
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, context.dex.contract.address],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, context.dex.contract.address],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        context.dex.contract.address
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        context.dex.contract.address
      ].balance;

      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(pairTokenABalance.toNumber(), tokenAAmount);
      strictEqual(pairTokenBBalance.toNumber(), tokenBAmount);

      strictEqual(context.dex.storage.pairs_count.toNumber(), 1);
      notStrictEqual(context.dex.storage.tokens["0"], null);
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount
      );
      strictEqual(
        context.dex.storage.pairs[0].token_a_pool.toNumber(),
        tokenAAmount
      );
      strictEqual(
        context.dex.storage.pairs[0].token_b_pool.toNumber(),
        tokenBAmount
      );
      strictEqual(
        context.dex.storage.tokens["0"].token_a_address,
        tokenAAddress
      );
      strictEqual(
        context.dex.storage.tokens["0"].token_b_address,
        tokenBAddress
      );
    });

    it("revert in case the pair exists", async function () {
      await rejects(
        context.createPair({
          tokenAAddress,
          tokenBAddress,
          tokenAAmount,
          tokenBAmount,
        }),
        (err) => {
          strictEqual(
            err.message,
            "Dex/non-zero-reserves",
            "Error message mismatch"
          );
          return true;
        }
      );
    });
  });

  describe("Test initialize after liquidity withdrawn when", () => {
    let tokenAAddress: string;
    let tokenBAddress: string;
    before(async () => {
      tokenAAddress = context.tokens[0].contract.address;
      tokenBAddress = context.tokens[1].contract.address;
      if (tokenAAddress > tokenBAddress) {
        tokenBAddress = context.tokens[0].contract.address;
        tokenAAddress = context.tokens[1].contract.address;
      }
    });
    it("revert in case liquidity isn't zero", async function () {
      await rejects(
        context.dex.initializeExchange(
          tokenAAddress,
          tokenBAddress,
          tokenAAmount,
          tokenBAmount
        ),
        (err) => {
          strictEqual(
            err.message,
            "Dex/non-zero-reserves",
            "Error message mismatch"
          );
          return true;
        }
      );
    });

    it("success in case liquidity is zero", async function () {
      await context.dex.divestLiquidity("0", 1, 1, tokenBAmount);
      await context.tokens[0].updateStorage({ ledger: [aliceAddress] });
      await context.tokens[1].updateStorage({ ledger: [aliceAddress] });
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      await context.dex.initializeExchange(
        tokenAAddress,
        tokenBAddress,
        tokenAAmount,
        tokenBAmount
      );
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, context.dex.contract.address],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, context.dex.contract.address],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        context.dex.contract.address
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        context.dex.contract.address
      ].balance;

      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(pairTokenABalance.toNumber(), tokenAAmount);
      strictEqual(pairTokenBBalance.toNumber(), tokenBAmount);

      strictEqual(context.dex.storage.pairs_count.toNumber(), 1);
      notStrictEqual(context.dex.storage.tokens["0"], null);
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount
      );
      strictEqual(
        context.dex.storage.pairs[0].token_a_pool.toNumber(),
        tokenAAmount
      );
      strictEqual(
        context.dex.storage.pairs[0].token_b_pool.toNumber(),
        tokenBAmount
      );
      strictEqual(
        context.dex.storage.tokens["0"].token_a_address,
        tokenAAddress
      );
      strictEqual(
        context.dex.storage.tokens["0"].token_b_address,
        tokenBAddress
      );
    });

    it("revert in case the amount of token A is zero", async function () {
      await context.dex.divestLiquidity("0", 1, 1, tokenBAmount);
      await rejects(
        context.dex.initializeExchange(
          tokenAAddress,
          tokenBAddress,
          0,
          tokenBAmount
        ),
        (err) => {
          strictEqual(err.message, "Dex/no-token-a", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case the amount of token B is zero", async function () {
      await rejects(
        context.dex.initializeExchange(
          tokenAAddress,
          tokenBAddress,
          tokenAAmount,
          0
        ),
        (err) => {
          strictEqual(err.message, "Dex/no-token-b", "Error message mismatch");
          return true;
        }
      );
    });
  });
});
