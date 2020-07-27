const { Dex: Dex12 } = require("./dex");

class Dex extends Dex12 {
  static async init(Tezos, dexAddress) {
    return new Dex(Tezos, await Tezos.contract.at(dexAddress));
  }

  async approve(tokenAmount, address) {
    let storage = await this.getFullStorage();
    let token = await this.tezos.contract.at(storage.storage.tokenAddress);
    let operation = await token.methods
      .update_operators([
        {
          add_operator: {
            owner: await this.tezos.signer.publicKeyHash(),
            operator: address,
          },
        },
      ])
      .send();
    await operation.confirmation();
  }
}
exports.Dex = Dex;
