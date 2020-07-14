const { TezosToolkit } = require("@taquito/taquito");
const fs = require("fs");
const assert = require("assert");
const BigNumber = require("bignumber.js");
const { InMemorySigner } = require("@taquito/signer");
const path = require("path");
const { MichelsonMap } = require("@taquito/michelson-encoder");

const { address: tokenAddress1 } = JSON.parse(
  fs.readFileSync("./deploy/Token.json").toString()
);

let dexAddress1;
let dexAddress2;

const { address: factoryAddress, network: provider } = JSON.parse(
  fs.readFileSync("./deploy/Factory.json").toString()
);
const { address: tokenAddress2 } = JSON.parse(
  fs.readFileSync("./deploy/Token2.json").toString()
);

const getContractFullStorage = async (Tezos, address, maps = {}) => {
  const contract = await Tezos.contract.at(address);
  const storage = await contract.storage();
  var result = {
    ...storage,
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
        ...(await prev),
        [current]: entry,
      };
    }, Promise.resolve({}));
  }
  return result;
};

const getContractFullStorageV2 = async (Tezos, address, maps = {}) => {
  const contract = await Tezos.contract.at(address);
  const storage = await contract.storage();
  var result = {
    ...storage,
  };
  for (let key in maps) {
    result[key + "Extended"] = await maps[key].reduce(async (prev, current) => {
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
    }, Promise.resolve({}));
  }
  return result;
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  async setFunction(index, lambda) {
    const operation = await this.contract.methods
      .setFunction(index, lambda)
      .send();
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

  async getFullStorage(Tezos, address, maps = {}) {
    const contract = await Tezos.contract.at(address);
    const storage = await contract.storage();
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
}

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

  async approve(tokenAmount) {
    let storage = await this.getFullStorage();
    let token = await this.tezos.contract.at(storage.tokenAddress);
    let operation = await token.methods.approve(dexAddress, tokenAmount).send();
    await operation.confirmation();
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
      .use(10, "withdrawProfit", receiver)
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

const setup = async (keyPath = "../key") => {
  keyPath = path.join(__dirname, keyPath);
  const secretKey = fs.readFileSync(keyPath).toString();
  let tezos = new TezosToolkit();
  await tezos.setProvider({
    rpc: provider,
    signer: await new InMemorySigner.fromSecretKey(secretKey),
  });
  return tezos;
};

class Test {
  static async before(tokenAddress, count = true) {
    let tezos = await setup();
    let tezos1 = await setup("../key1");
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .transfer(
        await tezos.signer.publicKeyHash(),
        await tezos1.signer.publicKeyHash(),
        "100000"
      )
      .send();
    await operation.confirmation();

    let factoryContract = await tezos.contract.at(factoryAddress);
    operation = await factoryContract.methods
      .launchExchange(tokenAddress)
      .send();
    await operation.confirmation();
    assert(operation.status === "applied", "Operation was not applied");

    let storage = await getContractFullStorageV2(tezos, factoryAddress, {
      tokenToExchange: [tokenAddress],
    });
    return storage.tokenToExchangeExtended[tokenAddress];
  }
  static async getDexAddress(tokenAddress) {
    let tezos = await setup();
    let storage = await getContractFullStorageV2(tezos, factoryAddress, {
      tokenToExchange: [tokenAddress],
    });
    return storage.tokenToExchangeExtended[tokenAddress];
  }

  static async initializeExchange(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let dex = await Dex.init(Tezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const pkh = await Tezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.feeRate == 333);
    assert(initialStorage.storage.invariant == 0);
    assert(initialStorage.storage.totalShares == 0);
    assert(initialStorage.storage.tezPool == 0);
    assert(initialStorage.storage.tokenPool == 0);
    assert(initialStorage.storage.tokenAddress == tokenAddress);
    assert(initialStorage.storage.factoryAddress == factoryAddress);
    assert(initialStorage.sharesExtended[pkh] == undefined);

    let operation = await dex.initializeExchange(tokenAmount, tezAmount);
    assert(operation.status === "applied", "Operation was not applied");

    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    assert(finalStorage.storage.feeRate == 333);
    assert(
      finalStorage.storage.invariant == mutezAmount * parseInt(tokenAmount)
    );
    assert(finalStorage.storage.tezPool == mutezAmount);
    assert(finalStorage.storage.tokenPool == tokenAmount);
    assert(finalStorage.storage.tokenAddress == tokenAddress);
    assert(finalStorage.storage.factoryAddress == factoryAddress);
    assert(finalStorage.sharesExtended[pkh] == 1000);
    assert(finalStorage.storage.totalShares == 1000);
  }

  static async investLiquidity(dexAddress, tokenAddress) {
    let Tezos = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let tezAmount = "5.0";
    const pkh = await Tezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );

    let operation = await dex.investLiquidity(
      tokenAmount,
      tezAmount,
      minShares
    );
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    assert(finalStorage.sharesExtended[pkh] == minShares);
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount)
    );
    assert(
      finalStorage.storage.totalShares ==
        parseInt(initialStorage.storage.totalShares) + parseInt(minShares)
    );
    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount))
    );
  }

  static async tokenToTezSwap(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let dex = await Dex.init(Tezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await Tezos.signer.publicKeyHash();

    const initialTezBalance = await Tezos.tz.getBalance(pkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    try {
      let operation = await dex.tokenToTezSwap(tokensIn, minTezOut);
      assert(operation.status === "applied", "Operation was not applied");
    } catch (e) {
      console.log(e);
    }
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await Tezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tokenToTokenSwap(dexAddress, tokenAddress, tokenAddressTo) {
    let Tezos = await setup();
    let dex = await Dex.init(Tezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await Tezos.signer.publicKeyHash();

    const initialTezBalance = await Tezos.tz.getBalance(pkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    const tokensOut = 1;
    try {
      let operation = await dex.tokenToTokenSwap(
        tokensIn,
        tokensOut,
        tokenAddressTo
      );
      assert(operation.status === "applied", "Operation was not applied");
    } catch (e) {
      console.log(e);
    }
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await Tezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance <= parseInt(initialTezBalance));
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tezToTokenSwap(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let dex = await Dex.init(Tezos, dexAddress);
    let tezAmount = "0.01";
    const pkh = await Tezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const initialTezBalance = await Tezos.tz.getBalance(pkh);

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    let operation = await dex.tezToTokenSwap(minTokens, tezAmount);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await Tezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) +
          parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tezToTokenPayment(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let tezAmount = "0.1";
    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh, pkh1] });
    const initialTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh, pkh1] }
    );
    const initialTezBalance = await Tezos.tz.getBalance(pkh);

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    let operation = await dex.tezToTokenPayment(minTokens, tezAmount, pkh1);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh1] }
    );
    const finalTezBalance = await Tezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh1].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh1].balance) +
          parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tokenToTezPayment(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();

    const initialTezBalance = await Tezos.tz.getBalance(pkh1);
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh, pkh1] });
    const initialTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh, pkh1] }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    let operation = await dex.tokenToTezPayment(tokensIn, minTezOut, pkh1);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      Tezos,
      tokenAddress,
      { ledger: [pkh, pkh1] }
    );
    const finalTezBalance = await Tezos.tz.getBalance(pkh1);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async divestLiquidity(dexAddress, tokenAddress) {
    let Tezos = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await Tezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    let operation = await dex.divestLiquidity(minTokens, minTez, sharesBurned);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    assert(
      finalStorage.sharesExtended[pkh] ==
        initialStorage.sharesExtended[pkh] - sharesBurned
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialStorage.storage.tezPool) - minTez
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialStorage.storage.tokenPool) - minTokens
    );
    assert(
      finalStorage.storage.totalShares ==
        parseInt(initialStorage.storage.totalShares) - sharesBurned
    );
    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialStorage.storage.tezPool) - minTez) *
          (parseInt(initialStorage.storage.tokenPool) - minTokens)
    );
  }

  static async setVotesDelegation(dexAddress) {
    let Tezos = await setup("../key1");
    let Tezos1 = await setup();
    let dex = await Dex.init(Tezos, dexAddress);
    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [pkh] });

    assert(!initialStorage.votersExtended[pkh]);

    let operation = await dex.setVotesDelegation(pkh1, true);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [pkh] });
    assert(finalStorage.votersExtended[pkh].allowances.includes(pkh1));
  }

  static async vote(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    // let delegate = await Tezos.signer.publicKeyHash();

    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [pkh1] });

    assert(initialStorage.votersExtended[pkh1].allowances.includes(pkh));
    assert(!initialStorage.votersExtended[pkh1].candidate);
    assert(!initialStorage.storage.delegated);

    let operation = await dex.vote(pkh1, delegate);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [pkh1] });
    assert(finalStorage.votersExtended[pkh1].candidate == delegate);
    assert(finalStorage.storage.delegated == delegate);
  }

  static async default(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    // let delegate = await Tezos.signer.publicKeyHash();
    let reward = 1;

    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [pkh1] });

    assert(initialStorage.storage.delegated == delegate);

    let operation = await dex.sendReward(reward);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [pkh1] });
    assert(finalStorage.storage.currentDelegated == delegate);
  }

  static async withdrawProfit(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos1, dexAddress);
    let reward = 10;
    let amount = 1;

    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({
      circleLoyalty: [pkh1],
      shares: [pkh1],
    });

    await sleep(3000);

    let operation = await dex.sendReward(amount);
    assert(operation.status === "applied", "Operation was not applied");
    // console.log(JSON.stringify(initialStorage.storage.currentCircle));
    // console.log(JSON.stringify(initialStorage.circleLoyaltyExtended[pkh1]));
    // console.log(JSON.stringify(initialStorage.sharesExtended[pkh1]));

    operation = await dex.withdrawProfit(pkh1);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ circleLoyalty: [pkh1] });
    // console.log(JSON.stringify(finalStorage.storage.currentCircle));
    // console.log(JSON.stringify(finalStorage.circleLoyaltyExtended[pkh1]));

    operation = await dex.sendReward(amount);
    assert(operation.status === "applied", "Operation was not applied");
    finalStorage = await dex.getFullStorage({ circleLoyalty: [pkh1] });
    // console.log(JSON.stringify(finalStorage.storage.currentCircle));
    // console.log(JSON.stringify(finalStorage.circleLoyaltyExtended[pkh1]));
  }

  static async veto(dexAddress, tokenAddress) {
    let Tezos = await setup();
    let Tezos1 = await setup("../key1");
    let dex = await Dex.init(Tezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    // let delegate = await Tezos.signer.publicKeyHash();

    const pkh = await Tezos.signer.publicKeyHash();
    const pkh1 = await Tezos1.signer.publicKeyHash();

    let operation = await dex.veto(pkh1);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({});
    assert(finalStorage.storage.veto == 0);
    assert(!finalStorage.storage.currentDelegated);
  }
}

describe("Correct calls", function () {
  before(async function () {
    this.timeout(1000000);

    dexAddress1 = await Test.before(tokenAddress1);
    dexAddress2 = await Test.before(tokenAddress2);
  });

  describe("InitializeExchange()", function () {
    it("should initialize exchange 1", async function () {
      this.timeout(1000000);
      await Test.initializeExchange(dexAddress1, tokenAddress1);
    });

    it("should initialize exchange 2", async function () {
      this.timeout(1000000);
      await Test.initializeExchange(dexAddress2, tokenAddress2);
    });
  });

  describe("InvestLiquidity()", function () {
    it("should invest liquidity 1", async function () {
      this.timeout(1000000);
      await Test.investLiquidity(dexAddress1, tokenAddress1);
    });

    it("should invest liquidity 2", async function () {
      this.timeout(1000000);
      await Test.investLiquidity(dexAddress2, tokenAddress2);
    });
  });

  describe("TezToTokenSwap()", function () {
    it("should exchange tez to token 1", async function () {
      this.timeout(1000000);
      await Test.tezToTokenSwap(dexAddress1, tokenAddress1);
    });

    it("should exchange tez to token 2", async function () {
      this.timeout(1000000);
      await Test.tezToTokenSwap(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTezSwap()", function () {
    it("should exchange tez to token 1", async function () {
      this.timeout(1000000);
      await Test.tokenToTezSwap(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token 2", async function () {
      this.timeout(1000000);
      await Test.tokenToTezSwap(dexAddress2, tokenAddress2);
    });
  });

  describe("TezToTokenPayment()", function () {
    it("should exchange tez to token and send to requested address 1", async function () {
      this.timeout(1000000);
      await Test.tezToTokenPayment(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token and send to requested address 2", async function () {
      this.timeout(1000000);
      await Test.tezToTokenPayment(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTezPayment()", function () {
    it("should exchange tez to token 1", async function () {
      this.timeout(1000000);
      await Test.tokenToTezPayment(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token 2", async function () {
      this.timeout(1000000);
      await Test.tokenToTezPayment(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTokenSwap()", function () {
    it("should exchange token to token 1", async function () {
      this.timeout(1000000);
      await Test.tokenToTokenSwap(dexAddress1, tokenAddress1, tokenAddress2);
    });

    it("should exchange token to token 2", async function () {
      this.timeout(1000000);
      await Test.tokenToTokenSwap(dexAddress2, tokenAddress2, tokenAddress1);
    });
  });

  describe("DivestLiquidity()", function () {
    it("should divest liquidity 1", async function () {
      this.timeout(1000000);
      await Test.divestLiquidity(dexAddress1, tokenAddress1);
    });

    it("should divest liquidity 2", async function () {
      this.timeout(1000000);
      await Test.divestLiquidity(dexAddress2, tokenAddress2);
    });
  });

  describe("SetVotesDelegation()", function () {
    it("should set vote delegate 1", async function () {
      this.timeout(1000000);
      await Test.setVotesDelegation(dexAddress1);
    });

    it("should set vote delegate 2", async function () {
      this.timeout(1000000);
      await Test.setVotesDelegation(dexAddress2);
    });
  });

  describe("Vote()", function () {
    it("should vote 1", async function () {
      this.timeout(1000000);
      await Test.vote(dexAddress1);
    });

    it("should vote 2", async function () {
      this.timeout(1000000);
      await Test.vote(dexAddress2);
    });
  });

  describe("Default()", function () {
    it("should receive reward 1", async function () {
      this.timeout(1000000);
      await Test.default(dexAddress1);
    });

    it("should receive reward 2", async function () {
      this.timeout(1000000);
      await Test.default(dexAddress2);
    });
  });

  describe("Veto()", function () {
    it("should set veto 1", async function () {
      this.timeout(1000000);
      await Test.veto(dexAddress1);
    });

    it("should set veto 2", async function () {
      this.timeout(1000000);
      await Test.veto(dexAddress2);
    });
  });

  describe("WithdrawProfit()", function () {
    it("should withdraw baker's profit 1", async function () {
      this.timeout(1000000);
      await Test.withdrawProfit(dexAddress1);
    });

    it("should withdraw baker's profit 2", async function () {
      this.timeout(1000000);
      await Test.withdrawProfit(dexAddress2);
    });
  });
});

describe("Incorrect Factory calls", function () {
  before(async function () {
    this.timeout(1000000);

    dexAddress1 = await Test.getDexAddress(tokenAddress1);
    dexAddress2 = await Test.getDexAddress(tokenAddress2);
  });

  describe("SetFunction()", function () {
    it("shouldn't add function with higher index 1", async function () {
      this.timeout(1000000);
      await Test.setFunctionWithHigherIndex(dexAddress1);
    });

    it("shouldn't add function with higher index 2", async function () {
      this.timeout(1000000);
      await Test.setFunctionWithHigherIndex(dexAddress2);
    });
  });
});
