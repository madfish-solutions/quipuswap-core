const { Factory: Factory12, factoryAddress } = require("./factory");

class Factory extends Factory12 {
  static async init(Tezos) {
    return new Factory(Tezos, await Tezos.contract.at(factoryAddress));
  }
  async launchExchange(tokenAddress, tokenId) {
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, tokenId)
      .send();
    await operation.confirmation();
    return operation;
  }
}
exports.Factory = Factory;
exports.factoryAddress = factoryAddress;
