const fs = require("fs");
const { execSync } = require("child_process");
const { getLigo } = require("./utils");

const { address: factoryAddress } = JSON.parse(
  fs.readFileSync("./deploy/Factory.json").toString()
);

class Factory {
  constructor(Tezos, contract) {
    this.tezos = Tezos;
    this.contract = contract;
  }

  static async init(Tezos) {
    return new Factory(Tezos, await Tezos.contract.at(factoryAddress));
  }

  async launchExchange(tokenAddress) {
    const operation = await this.contract.methods
      .launchExchange(tokenAddress)
      .send();
    await operation.confirmation();
    return operation;
  }

  async setFunction(index, lambdaName) {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/Factory.ligo main 'SetFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await this.tezos.contract.transfer({
      to: factoryAddress,
      amount: 0,
      parameter: {
        entrypoint: "setFunction",
        value: JSON.parse(stdout).args[0].args[0],
      },
    });
    await operation.confirmation();
    return operation;
  }

  async tokenLookup(token, receiver, minTokensOut) {
    const operation = await this.contract.methods
      .tokenLookup(token, receiver, minTokensOut)
      .send();
    await operation.confirmation();
    return operation;
  }

  async getFullStorage(maps = {}) {
    const storage = await this.contract.storage();
    var result = {
      ...storage,
    };
    for (let key in maps) {
      result[key + "Extended"] = await maps[key].reduce(
        async (prev, current) => {
          let entry;

          try {
            entry = await storage.storage[key].get(current);
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
