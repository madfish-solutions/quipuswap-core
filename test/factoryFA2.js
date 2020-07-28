const { Factory: Factory12, factoryAddress } = require("./factory");
const { execSync } = require("child_process");
const { getLigo } = require("./utils");

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
  async setFunction(index, lambdaName) {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contractsV2/Factory.ligo main 'SetFunction(${index}n, ${lambdaName})'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await this.tezos.contract.transfer({
      to: factoryAddress,
      amount: 0,
      parameter: {
        entrypoint: "setFunction",
        value: JSON.parse(stdout).args[0],
      },
    });
    await operation.confirmation();
    return operation;
  }
}
exports.Factory = Factory;
exports.factoryAddress = factoryAddress;
