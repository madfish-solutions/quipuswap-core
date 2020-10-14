import { Context } from "./contracManagers/context";
import { equal } from "assert";

describe("Initialization calls", function () {
  before(async function () {});

  describe("InitializeExchange()", function () {
    it("should initialize 1 exchange", async function () {
      // create context without exchanges
      let context = await Context.init([]);
    });
  });
});
