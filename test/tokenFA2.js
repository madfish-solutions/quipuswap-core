const TOKEN_IDX = 1;

class Token {
  constructor(Tezos, contract) {
    this.tezos = Tezos;
    this.contract = contract;
  }

  static async init(Tezos, tokenAddress) {
    return new Token(Tezos, await Tezos.contract.at(tokenAddress));
  }

  async getRealStorage(maps = {}) {
    const storage = await this.contract.storage();
    var result = {
      ...storage,
    };
    for (let key in maps) {
      result[key + "Extended"] = await maps[key].reduce(
        async (prev, current) => {
          let entry;

          try {
            entry = await storage.tzip12[key].get(current);
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
  async getFullStorage(maps = {}, token_id = TOKEN_IDX) {
    const storage = await this.contract.storage();
    var result = {
      ...storage,
    };
    for (let key in maps) {
      result[key + "Extended"] = await maps[key].reduce(
        async (prev, current) => {
          let entry;

          try {
            if (key === "ledger") {
              entry = {
                balance: await storage.tzip12[key].get([current, token_id]),
              };
            } else {
              entry = await storage.tzip12[key].get(current);
            }
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

  async transfer(from_, to_, amount, token_id = TOKEN_IDX) {
    let operation = await this.contract.methods
      .transfer([
        {
          from_,
          txs: [
            {
              token_id,
              amount,
              to_,
            },
          ],
        },
      ])
      .send();
    await operation.confirmation();
    return operation;
  }
}

exports.Token = Token;
exports.TOKEN_IDX = TOKEN_IDX;
