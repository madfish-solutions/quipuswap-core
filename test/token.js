class Token {
  constructor(Tezos, contract) {
    this.tezos = Tezos;
    this.contract = contract;
  }

  static async init(Tezos, tokenAddress) {
    return new Token(Tezos, await Tezos.contract.at(tokenAddress));
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
            entry = await storage[key].get(current);
          } catch (ex) {
            console.error(ex);
          }

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

  async transfer(from_, to_, amount) {
    let operation = await this.contract.methods
      .transfer(from_, to_, amount)
      .send();
    await operation.confirmation();
    return operation;
  }
}
exports.Token = Token;
