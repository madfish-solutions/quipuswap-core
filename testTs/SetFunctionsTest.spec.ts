import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { TezosOperationError } from "@taquito/taquito";

contract("SetXFunctions()", function () {
  it("should set all Dex functions to Factory", async function () {
    // create Factory
    let context = await Context.init([], false);

    // ensure no functions are stored
    await context.factory.updateStorage();
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      strictEqual(value, null, "Dex function set");
    });

    // set all Dex functions
    await context.setDexFactoryFunctions();

    // ensure code added
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      notStrictEqual(value, null, "Dex function not set");
    });
  });

  it("should set all Token functions to Factory", async function () {
    // create Factory
    let context = await Context.init([], false);

    // ensure no functions are stored
    await context.factory.updateStorage();
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      strictEqual(value, null, "Token function set");
    });

    // set all Token functions
    await context.setTokenFactoryFunctions();

    // ensure code added
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      notStrictEqual(value, null, "Token function not set");
    });
  });

  it("should fail replacement of Dex functions to Factory", async function () {
    // create Factory
    let context = await Context.init([]);

    // ensure code added
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      notStrictEqual(value, null, "Dex function not set");
    });

    // ensure attempt to replace function fails
    await rejects(
      context.factory.setDexFunction(1, "initializeExchange"),
      (err) => {
        strictEqual(
          err.message,
          "Factory/function-set",
          "Error message mismatch"
        );
        return true;
      },
      "Replacement of dex function should fail"
    );
  });

  it("should fail replacement of Token functions to Factory", async function () {
    // create Factory
    let context = await Context.init([]);

    // ensure code added
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      notStrictEqual(value, null, "Token function not set");
    });

    // ensure attempt to replace function fails
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
      "Replacement of Token function should fail"
    );
  });

  it("should fail adding more than 9 Dex functions to Factory", async function () {
    // create Factory
    let context = await Context.init([]);

    // ensure code added
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      notStrictEqual(value, null, "Dex function not set");
    });

    // ensure attempt to add extra function fails
    await rejects(
      context.factory.setDexFunction(9, "initializeExchange"),
      (err) => {
        strictEqual(
          err.message,
          "Factory/wrong-index",
          "Error message mismatch"
        );
        return true;
      },
      "Adding more dex functions should fail"
    );
  });

  it("should fail adding more than 5 Token functions to Factory", async function () {
    // create Factory
    let context = await Context.init([]);

    // ensure code added
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      notStrictEqual(value, null, "Token function not set");
    });

    // ensure attempt to replace function fails
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
      "Adding more token functions should fail"
    );
  });
});
