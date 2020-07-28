class Dex {
  constructor(Tezos, contract) {
    this.tezos = Tezos;
    this.contract = contract;
  }

  static async init(Tezos, dexAddress) {
    return new Dex(Tezos, await Tezos.contract.at(dexAddress));
  }

  async getFullStorage(
    maps = { shares: [], voters: [], vetos: [], vetoVoters: [], votes: [] }
  ) {
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

  async veto(voter) {
    const operation = await this.contract.methods.use(8, "veto", voter).send();
    await operation.confirmation();
    return operation;
  }

  async sendReward(amount) {
    const operation = await this.tezos.contract.transfer({
      to: this.contract.address,
      amount,
    });
    await operation.confirmation();
    return operation;
  }

  async vote(voter, delegate) {
    const operation = await this.contract.methods
      .use(7, "vote", voter, delegate)
      .send();
    await operation.confirmation();
    return operation;
  }

  async withdrawProfit(receiver) {
    const operation = await this.contract.methods
      .use(3, "withdrawProfit", receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async setVotesDelegation(voter, allowance) {
    const operation = await this.contract.methods
      .use(6, "setVotesDelegation", voter, allowance)
      .send();
    await operation.confirmation();
    return operation;
  }

  async initializeExchange(tokenAmount, tezAmount) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(0, "initializeExchange", tokenAmount)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async investLiquidity(tokenAmount, tezAmount, minShares) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(4, "investLiquidity", minShares)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async divestLiquidity(tokenAmount, tezAmount, sharesBurned) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(5, "divestLiquidity", sharesBurned, tezAmount, tokenAmount)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tezToTokenSwap(minTokens, tezAmount) {
    const operation = await this.contract.methods
      .use(
        1,
        "tezToTokenPayment",
        minTokens,
        await this.tezos.signer.publicKeyHash()
      )
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenPayment(minTokens, tezAmount, receiver) {
    const operation = await this.contract.methods
      .use(1, "tezToTokenPayment", minTokens, receiver)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tokenToTezSwap(tokenAmount, minTezOut) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(
        2,
        "tokenToTezPayment",
        tokenAmount,
        minTezOut,
        await this.tezos.signer.publicKeyHash()
      )
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTezPayment(tokenAmount, minTezOut, receiver) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(2, "tokenToTezPayment", tokenAmount, minTezOut, receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenSwap(tokenAmount, minTokensOut, tokenAddress) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(
        3,
        "tokenToTokenPayment",
        tokenAmount,
        minTokensOut,
        tokenAddress,
        await this.tezos.signer.publicKeyHash()
      )
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenPayment(tokenAmount, minTokensOut, tokenAddress, receiver) {
    await this.approve(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(
        3,
        "tokenToTokenPayment",
        tokenAmount,
        minTokensOut,
        tokenAddress,
        receiver
      )
      .send();
    await operation.confirmation();
    return operation;
  }

  async approve(tokenAmount, address) {
    let storage = await this.getFullStorage();
    let token = await this.tezos.contract.at(storage.storage.tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await operation.confirmation();
  }
}
exports.Dex = Dex;
