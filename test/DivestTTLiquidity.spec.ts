import { TTContext } from "./helpers/ttContext";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { defaultAccountInfo } from "./constants";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract("DivestTTLiquidity()", function () {
  let context: TTContext;
  const tokenAAmount: number = 1000;
  const tokenBAmount: number = 100000;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  let tokenAAddress;
  let tokenBAddress;
  const receivedTokenAAmount: number = 200;
  const receivedTokenBAmount: number = 20000;
  const burntShares: number = 200;

  before(async () => {
    context = await TTContext.init([], false, "alice", false);
    await context.setAllDexFunctions();
    await context.createPair({
      tokenAAmount,
      tokenBAmount,
    });
    tokenAAddress = context.tokens[0].contract.address;
    tokenBAddress = context.tokens[1].contract.address;
    if (standard != "FA2FA12" && tokenAAddress > tokenBAddress) {
      const tmp = context.tokens[0];
      context.tokens[0] = context.tokens[1];
      context.tokens[1] = tmp;
      tokenAAddress = context.tokens[0].contract.address;
      tokenBAddress = context.tokens[1].contract.address;
    }
  });

  describe("Test if the diivestment is allowed", () => {
    const initToken = 1000000;
    const initTez = 10000;

    it("revert in case no liquidity is provided", async function () {
      await context.dex.divestLiquidity("0", 1, 1, tokenAAmount);
      await rejects(
        context.dex.divestLiquidity("0", 1, 1, burntShares),
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
      await context.dex.divestLiquidity("0", 1, 1, burntShares);
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares -
          (tokenAAmount < tokenBAmount
            ? receivedTokenAAmount
            : receivedTokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() - receivedTokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() - receivedTokenBAmount
      );
    });
  });

  describe("Test various burnt shares", () => {
    it("revert in case of 0 burnt shares", async function () {
      await rejects(context.dex.divestLiquidity("0", 1, 1, 0), (err) => {
        ok(err.message == "Dex/zero-burn-shares", "Error message mismatch");
        return true;
      });
    });

    it("revert in case of too high expected burnt shares", async function () {
      await rejects(context.dex.divestLiquidity("0", 1, 1, 20000), (err) => {
        ok(err.message == "Dex/insufficient-shares", "Error message mismatch");
        return true;
      });
    });

    it("success in case of burnt shares of 1", async function () {
      const receivedTokenAAmount: number = 1;
      const receivedTokenBAmount: number = 100;
      const burntShares: number = 1;
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
      await context.dex.divestLiquidity("0", 1, 1, burntShares);
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares -
          (tokenAAmount < tokenBAmount
            ? receivedTokenAAmount
            : receivedTokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() - receivedTokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() - receivedTokenBAmount
      );
    });

    it("success in case the medium burnt shares", async function () {
      const receivedTokenAAmount: number = 99;
      const receivedTokenBAmount: number = 9900;
      const burntShares: number = 99;
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
      await context.dex.divestLiquidity("0", 1, 1, burntShares);
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        aliceInitShares -
          (tokenAAmount < tokenBAmount
            ? receivedTokenAAmount
            : receivedTokenBAmount)
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        initDexPair.token_a_pool.toNumber() - receivedTokenAAmount
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        initDexPair.token_b_pool.toNumber() - receivedTokenBAmount
      );
    });

    it("success in case of exact burnt shares", async function () {
      const receivedTokenAAmount: number = 700;
      const receivedTokenBAmount: number = 70000;
      const burntShares: number = 700;
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
      await context.dex.divestLiquidity("0", 1, 1, burntShares);
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        0
      );
      strictEqual(finalDexPair.token_a_pool.toNumber(), 0);
      strictEqual(finalDexPair.token_b_pool.toNumber(), 0);
    });
  });

  describe("Test calculated received amount", () => {
    it("revert in case of calculated tez are zero", async function () {
      const initTokenA = 100000;
      const initTokenB = 100;
      const share = 1;
      await context.dex.initializeExchange(
        tokenAAddress,
        tokenBAddress,
        initTokenA,
        initTokenB
      );
      await context.dex.tokenToTokenPayment(
        tokenAAddress,
        tokenBAddress,
        "sell",
        2000,
        1,
        bobAddress
      );
      await rejects(context.dex.divestLiquidity("0", 1, 1, share), (err) => {
        ok(err.message == "Dex/high-expectation", "Error message mismatch");
        return true;
      });
      await context.dex.divestLiquidity("0", 1, 1, initTokenB);
    });

    it("revert in case of calculated tokens are zero", async function () {
      const initTokenA = 100;
      const initTokenB = 100000;
      const share = 1;
      await context.dex.initializeExchange(
        tokenAAddress,
        tokenBAddress,
        initTokenA,
        initTokenB
      );
      await context.dex.tokenToTokenPayment(
        tokenAAddress,
        tokenBAddress,
        "buy",
        2000,
        1,
        bobAddress
      );
      await rejects(context.dex.divestLiquidity("0", 1, 1, share), (err) => {
        ok(err.message == "Dex/high-expectation", "Error message mismatch");
        return true;
      });
      await context.dex.divestLiquidity("0", 1, 1, initTokenA);
    });
  });

  describe("Test expected amount", () => {
    before(async () => {
      const initTokenB = 100000;
      const initTokenA = 100;
      await context.dex.initializeExchange(
        tokenAAddress,
        tokenBAddress,
        initTokenA,
        initTokenB
      );
    });

    it("revert in case of expected tez are higher", async function () {
      const share = 100;
      await rejects(
        context.dex.divestLiquidity("0", 1, 100000000, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case of expected tokens are higher", async function () {
      const share = 100;
      await rejects(
        context.dex.divestLiquidity("0", 100000000, 1, share),
        (err) => {
          ok(err.message == "Dex/high-expectation", "Error message mismatch");
          return true;
        }
      );
    });

    it("revert in case of expected tokens are 0", async function () {
      const share = 1;
      await rejects(context.dex.divestLiquidity("0", 0, 1, share), (err) => {
        ok(err.message == "Dex/dust-output", "Error message mismatch");
        return true;
      });
    });

    it("revert in case of expected tez are 0", async function () {
      const share = 1;
      await rejects(context.dex.divestLiquidity("0", 1, 0, share), (err) => {
        ok(err.message == "Dex/dust-output", "Error message mismatch");
        return true;
      });
    });

    it("success in case the of the expected amount smaller than calculated", async function () {
      const receivedTokenAAmount: number = 20;
      const receivedTokenBAmount: number = 20000;
      const burntShares: number = 20;
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
      await context.dex.divestLiquidity("0", 10, 10, burntShares);
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
    });

    it("success in case the of the exact expected tez and tokens", async function () {
      const receivedTokenAAmount: number = 70;
      const receivedTokenBAmount: number = 70000;
      const burntShares: number = 70;
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
      await context.dex.divestLiquidity(
        "0",
        receivedTokenAAmount,
        receivedTokenBAmount,
        burntShares
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
        aliceInitTokenABalance.toNumber() + receivedTokenAAmount,
        aliceFinalTokenABalance.toNumber()
      );
      strictEqual(
        aliceInitTokenBBalance.toNumber() + receivedTokenBAmount,
        aliceFinalTokenBBalance.toNumber()
      );
      strictEqual(
        pairTokenABalance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        pairTokenBBalance.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
      strictEqual(
        context.dex.storage.ledger[aliceAddress].balance.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        finalDexPair.token_a_pool.toNumber(),
        pairInitTokenABalance.minus(receivedTokenAAmount).toNumber()
      );
      strictEqual(
        finalDexPair.token_b_pool.toNumber(),
        pairInitTokenBBalance.minus(receivedTokenBAmount).toNumber()
      );
    });
  });
});
