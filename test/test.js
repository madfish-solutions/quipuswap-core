const { TezosToolkit } = require("@taquito/taquito");
const fs = require("fs");
const assert = require("assert");
const BigNumber = require("bignumber.js");
const { InMemorySigner } = require("@taquito/signer");
const path = require('path');
const { MichelsonMap } = require('@taquito/michelson-encoder');

const { address: tokenAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/Token.json").toString()
);
const { address: dexAddress } = JSON.parse(
  fs.readFileSync(process.argv[3] || "./deploy/Dex.json").toString()
);
const { address: factoryAddress } = JSON.parse(
  fs.readFileSync(process.argv[4] || "./deploy/Factory.json").toString()
);
const provider = process.argv[5] || "https://api.tez.ie/rpc/carthagenet";

class Dex {

  constructor(Tezos, contract) {
    this.tezos = Tezos;
    this.contract = contract;
  }

  static async init(Tezos) {
    return new Dex(Tezos, await Tezos.contract.at(dexAddress))
  }

  async getFullStorage(maps = { shares: [], voters: [], vetos: [], veto_voters: [], votes: [] }) {
    const storage = await this.contract.storage();
    var result = {
      ...storage
    };
    for (let key in maps) {
      result[key + "Extended"] = await maps[key].reduce(async (prev, current) => {
        let entry;

        try {
          entry = await storage[key].get(current);
        } catch (ex) {
          console.error(ex);
        }

        return {
          ...await prev,
          [current]: entry
        };
      }, Promise.resolve({}));
    }
    return result;
  }

  async approve(tokenAmount) {
    let storage = await this.getFullStorage();
    let token = await this.tezos.contract.at(storage.tokenAddress);
    let operation = await token.methods
      .approve(dexAddress, tokenAmount)
      .send();
    await operation.confirmation();
  }

  async veto(voter) {
    const operation = await this.contract.methods
      .veto(voter)
      .send();
    await operation.confirmation();
    return operation;
  }

  async vote(voter, delegate) {
    const operation = await this.contract.methods
      .vote(voter, delegate)
      .send();
    await operation.confirmation();
    return operation;
  }

  async setVotesDelegation(voter, allowance) {
    const operation = await this.contract.methods
      .setVotesDelegation(voter, allowance)
      .send();
    await operation.confirmation();
    return operation;
  }

  async initializeExchange(tokenAmount, tezAmount) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .initializeExchange(tokenAmount)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async investLiquidity(tokenAmount, tezAmount, minShares) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .investLiquidity(minShares)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async divestLiquidity(tokenAmount, tezAmount, sharesBurned) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .divestLiquidity(sharesBurned, tezAmount, tokenAmount)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenSwap(minTokens, tezAmount) {
    const operation = await this.contract.methods
      .tezToTokenSwap(minTokens)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenPayment(minTokens, tezAmount, receiver) {
    const operation = await this.contract.methods
      .tezToTokenPayment(minTokens, receiver)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tokenToTezSwap(tokenAmount, minTezOut) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTezSwap(tokenAmount, minTezOut)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTezPayment(tokenAmount, minTezOut, receiver) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTezPayment(tokenAmount, minTezOut, receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenSwap(tokenAmount, minTokensOut, tokenAddress) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTokenSwap(tokenAmount, minTokensOut, tokenAddress)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenPayment(tokenAmount, minTokensOut, tokenAddress, receiver) {
    await approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTokenPayment(tokenAmount, minTokensOut, tokenAddress, receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

}

const setup = async (keyPath = "../key") => {
  keyPath = path.join(__dirname, keyPath)
  const secretKey = fs.readFileSync(keyPath).toString();
  let tezos = new TezosToolkit();
  await tezos.setProvider({ rpc: provider, signer: await new InMemorySigner.fromSecretKey(secretKey) });
  return tezos;
};

describe('Dex', function () {
  before(async function () {
    this.timeout(1000000);
    let tezos = await setup();
    let tezos1 = await setup("../key1");
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .transfer(await tezos.signer.publicKeyHash(), await tezos1.signer.publicKeyHash(), "100000")
      .send();
    await operation.confirmation();
  });

  describe('initializeExchange()', function () {
    it('should initialize exchange', async function () {
    });
  });
});

