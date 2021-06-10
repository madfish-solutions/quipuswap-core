import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract("InvestTTLiquidity()", function () {
  let context: TTContext;
  const tokenAAmount: number = 1000;
  const tokenBAmount: number = 100000;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const newShares: number = 1000;
  let tokenAAddress;
  let tokenBAddress;

  before(async () => {
    context = await TTContext.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
  });

  describe("Test if the investment is allowed", () => {
    before(async () => {});

    it("revert in case no liquidity is provided", async function () {
      await context.dex.divestLiquidity("0", 1, 1, tokenAAmount);
      await rejects(
        context.dex.investLiquidity("0", tokenAAmount, tokenBAmount, 100),
        (err) => {
          ok(err.message == "Dex/not-launched", "Error message mismatch");
          return true;
        }
      );
    });

    it("success in case the exchange is launched", async function () {
      const pairAddress = context.dex.contract.address;
      await context.dex.initializeExchange(
        tokenAAddress,
        tokenBAddress,
        tokenAAmount,
        tokenBAmount
      );
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
      await context.dex.investLiquidity(
        "0",
        tokenAAmount,
        tokenBAmount,
        newShares
      );
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.plus(tokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.plus(tokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares +
          (tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() + tokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() + tokenBAmount
      );
    });
  });

  describe("Test various min shared", () => {
    before(async () => {});

    it("success in case of min shares of 1", async function () {
      const pairAddress = context.dex.contract.address;
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
      await context.dex.investLiquidity("0", tokenAAmount, tokenBAmount, 1);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.plus(tokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.plus(tokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares +
          (tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() + tokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() + tokenBAmount
      );
    });

    it("success in case of unequal min shares", async function () {
      const pairAddress = context.dex.contract.address;
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
      await context.dex.investLiquidity(
        "0",
        tokenAAmount + 100,
        tokenBAmount,
        newShares
      );
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.plus(tokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.plus(tokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares +
          (tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() + tokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() + tokenBAmount
      );
    });
  });

  describe("Test purchased shares", () => {
    before(async () => {});

    it("success in case of more then 0 tokens purchesed", async function () {
      const pairAddress = context.dex.contract.address;
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const aliceInitShares =
        context.dex.storage.ledger[aliceAddress].balance.toNumber();
      const aliceInitTokenABalance = (
        (await context.tokens[0].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const aliceInitTokenBBalance = (
        (await context.tokens[1].storage.ledger[aliceAddress]) ||
        defaultAccountInfo
      ).balance;
      const pairInitTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairInitTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      const initDexPair = context.dex.storage.pairs[0];
      await context.dex.investLiquidity("0", tokenAAmount, tokenBAmount, 1);
      await context.tokens[0].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.tokens[1].updateStorage({
        ledger: [aliceAddress, pairAddress],
      });
      await context.dex.updateStorage({
        ledger: [[aliceAddress, 0]],
        tokens: ["0"],
        pairs: ["0"],
      });
      const finalDexPair = context.dex.storage.pairs[0];
      const aliceFinalTokenABalance = await context.tokens[0].storage.ledger[
        aliceAddress
      ].balance;
      const aliceFinalTokenBBalance = await context.tokens[1].storage.ledger[
        aliceAddress
      ].balance;
      const pairTokenABalance = await context.tokens[0].storage.ledger[
        pairAddress
      ].balance;
      const pairTokenBBalance = await context.tokens[1].storage.ledger[
        pairAddress
      ].balance;
      strictEqual(
        aliceInitTokenABalance.toNumber() - tokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() - tokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.plus(tokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.plus(tokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares +
          (tokenAAmount < tokenBAmount ? tokenAAmount : tokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() + tokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() + tokenBAmount
      );
    });

    it("revert in case of 0 purchased shares", async function () {
      await context.dex.tokenToTokenPayment(
        tokenAAddress,
        tokenBAddress,
        "buy",
        1000,
        1,
        bobAddress
      );
      await rejects(context.dex.investLiquidity("0", 1, 1, 1), (err) => {
        ok(err.message == "Dex/wrong-params", "Error message mismatch");
        return true;
      });
    });
  });
});
