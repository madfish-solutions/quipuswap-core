const { Factory: Factory12, factoryAddress } = require("./factory");
const { execSync } = require("child_process");
const { getLigo } = require("./utils");
const { TOKEN_IDX } = require("./tokenFA2");

class Factory extends Factory12 {
  static async init(Tezos) {
    return new Factory(Tezos, await Tezos.contract.at(factoryAddress));
  }
  async launchExchange(tokenAddress, tokenId = TOKEN_IDX) {
    const operation = await this.contract.methods
      .launchExchange(tokenId, tokenAddress)
      .send();
    await operation.confirmation();
    return operation;
  }

  async getFullStorage(maps = {}, tokenId = TOKEN_IDX) {
    const storage = await this.contract.storage();
    var result = {
      ...storage,
    };
    for (let key in maps) {
      result[key + "Extended"] = await maps[key].reduce(
        async (prev, current) => {
          let entry;

          try {
            entry = await storage.storage[key].get(
              key === "tokenToExchange" ? [current, tokenId] : current
            );
          } catch (ex) {}

          return {
            ...(await prev),
            [current]: entry,
          };
        },
        Promise.resolve({})
      );
    }
    return result;
  }
}
exports.Factory = Factory;
exports.factoryAddress = factoryAddress;
