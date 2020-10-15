import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { TezosOperationError } from "@taquito/taquito";

describe("SetXFunctions()", function () {
  it("should set all Dex functions to Factory", async function () {
    // create Factory
    let context = await Context.init([], false);

    // ensure no functions are stored
    await context.factory.updateStorage({
      dexLambdas: [...Array(9).keys()],
      tokenLambdas: [...Array(5).keys()],
    });
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      strictEqual(value, null, "Dex function set");
    });
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      strictEqual(value, null, "Token function set");
    });

    // set all Dex functions
    await context.setAllFactoryFunctions();

    // ensure code added
    Object.values(context.factory.storage.dexLambdas).forEach((value) => {
      notStrictEqual(value, null, "Dex function not set");
    });
    Object.values(context.factory.storage.tokenLambdas).forEach((value) => {
      notStrictEqual(value, null, "Token function not set");
    });
  });

  it.skip("should set all Token functions to Factory", async function () {
    // create Factory
    // set all Dex functions
    // ensure code added
  });

  it.skip("should fail replacement of Dex functions to Factory", async function () {
    // create Factory
    // set all Dex functions
    // ensure code added
  });

  it.skip("should fail replacement of Token functions to Factory", async function () {
    // create Factory
    // set all Dex functions
    // ensure code added
  });

  it.skip("should fail adding more than 9 Dex functions to Factory", async function () {
    // create Factory
    // set all Dex functions
    // ensure code added
  });

  it.skip("should fail adding more than 5 Token functions to Factory", async function () {
    // create Factory
    // set all Dex functions
    // ensure code added
  });
});
