import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";

contract("SetXFunctions()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    pairAddress = await context.createPair();
    tokenAddress = await context.pairs[0].contract.address;
  });

  describe("Test function with different intention can be set", () => {
    it("success in case of setting all exchange functions to Factory", async function () {
      // ensure no functions are stored
      await context.factory.updateStorage();
      Object.values(context.factory.storage.dex_lambdas).forEach((value) => {
        strictEqual(value, null, "Dex function set");
      });

      // set all Dex functions
      await context.setDexFactoryFunctions();

      // ensure code added
      Object.values(context.factory.storage.dex_lambdas).forEach((value) => {
        notStrictEqual(value, null, "Dex function not set");
      });
    });

    it("success in case of setting all token functions to Factory", async function () {
      // ensure no functions are stored
      await context.factory.updateStorage();
      Object.values(context.factory.storage.token_lambdas).forEach((value) => {
        strictEqual(value, null, "Token function set");
      });

      // set all Token functions
      await context.setTokenFactoryFunctions();

      // ensure code added
      Object.values(context.factory.storage.token_lambdas).forEach((value) => {
        notStrictEqual(value, null, "Token function not set");
      });
    });
  });

  describe("Test function replacement", () => {
    it("revert replacement of Dex functions to Factory", async function () {
      await rejects(
        context.factory.setDexFunction(1, "initialize_exchange"),
        (err) => {
          strictEqual(
            err.message,
            "Factory/function-set",
            "Error message mismatch"
          );
          return true;
        },
        "Replacement of dex function should revert"
      );
    });

    it("revert replacement of Token functions to Factory", async function () {
      await rejects(
        context.factory.setTokenFunction(1, "transfer"),
        (err) => {
          strictEqual(
            err.message,
            "Factory/function-set",
            "Error message mismatch"
          );
          return true;
        },
        "Replacement of dex function should revert"
      );
    });
  });

  describe("Test functions count", () => {
    it("revert adding more than 9 exchange functions to Factory", async function () {
      await rejects(
        context.factory.setDexFunction(9, "initialize_exchange"),
        (err) => {
          strictEqual(
            err.message,
            "Factory/wrong-index",
            "Error message mismatch"
          );
          return true;
        },
        "Adding more dex functions should revert"
      );
    });

    it("revert adding more than 5 token functions to Factory", async function () {
      await rejects(
        context.factory.setTokenFunction(5, "transfer"),
        (err) => {
          strictEqual(
            err.message,
            "Factory/wrong-index",
            "Error message mismatch"
          );
          return true;
        },
        "Adding more token functions should revert"
      );
    });
  });
});
