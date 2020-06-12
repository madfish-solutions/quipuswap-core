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

const { address: initializeExchangeAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/InitializeExchange.json").toString()
);

const { address: investLiquidityAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/InvestLiquidity.json").toString()
);

const { address: tezToTokenSwapAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/TezToTokenSwap.json").toString()
);

const { address: tokenToTezSwapAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/TokenToTezSwap.json").toString()
);
const { address: tezToTokenPaymentAddress } = JSON.parse(
  fs.readFileSync(process.argv[2] || "./deploy/TezToTokenPayment.json").toString()
);

const { address: dexAddress } = JSON.parse(
  fs.readFileSync(process.argv[3] || "./deploy/Dex.json").toString()
);

const { address: factoryAddress } = JSON.parse(
  fs.readFileSync(process.argv[4] || "./deploy/Factory.json").toString()
);
const provider = process.argv[5] || "https://api.tez.ie/rpc/carthagenet";

const getContractFullStorage = async (Tezos, address, maps = {}) => {
  const contract = await Tezos.contract.at(address);
  const storage = await contract.storage();
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
};

class Dex {

  constructor(Tezos, contract, initializeExchange, investLiquidity, tezToTokenSwap, tokenToTezSwap, tezToTokenPayment) {
    this.tezos = Tezos;
    this.contract = contract;
    this.initializeExchangeContract = initializeExchange;
    this.investLiquidityContract = investLiquidity;
    this.tezToTokenSwapContract = tezToTokenSwap;
    this.tezToTokenPaymentContract = tezToTokenPayment;
    this.tokenToTezSwapContract = tokenToTezSwap;
  }

  static async init(Tezos) {
    return new Dex(Tezos, await Tezos.contract.at(dexAddress),
      await Tezos.contract.at(initializeExchangeAddress),
      await Tezos.contract.at(investLiquidityAddress),
      await Tezos.contract.at(tezToTokenSwapAddress),
      await Tezos.contract.at(tokenToTezSwapAddress),
      await Tezos.contract.at(tezToTokenPaymentAddress)
    );
  }

  async prepare() {
    let operation = await this.initializeExchangeContract.methods
      .setMain(dexAddress)
      .send();
    await operation.confirmation();

    operation = await this.investLiquidityContract.methods
      .setMain(dexAddress)
      .send();
    await operation.confirmation();

    operation = await this.tezToTokenSwapContract.methods
      .setMain(dexAddress)
      .send();
    await operation.confirmation();

    operation = await this.tokenToTezSwapContract.methods
      .setMain(dexAddress)
      .send();
    await operation.confirmation();

    operation = await this.tezToTokenPaymentContract.methods
      .setMain(dexAddress)
      .send();
    await operation.confirmation();
  }

  async getFullStorage(maps = { shares: [] }) {
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

  async approve(tokenAmount, address) {
    let storage = await this.getFullStorage();
    let token = await this.tezos.contract.at(storage.tokenAddress);
    let operation = await token.methods
      .approve(address, tokenAmount)
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
    await this.approve(tokenAmount, this.initializeExchangeContract.address);
    const operation = await this.initializeExchangeContract.methods
      .use(tokenAmount)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async investLiquidity(tokenAmount, tezAmount, minShares) {
    await this.approve(tokenAmount, this.investLiquidityContract.address);
    const operation = await this.investLiquidityContract.methods
      .use(minShares)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async divestLiquidity(tokenAmount, tezAmount, sharesBurned) {
    await this.approve(tokenAmount);
    const operation = await this.contract.methods
      .divestLiquidity(sharesBurned, tezAmount, tokenAmount)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenSwap(minTokens, tezAmount) {
    const operation = await this.tezToTokenSwapContract.methods
      .use(minTokens)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenPayment(minTokens, tezAmount, receiver) {
    const operation = await this.tezToTokenPaymentContract.methods
      .use(minTokens, receiver)
      .send({ amount: tezAmount });
    await operation.confirmation();
    return operation;
  }

  async tokenToTezSwap(tokenAmount, minTezOut) {
    await this.approve(tokenAmount);
    const operation = await this.tokenToTezSwapContract.methods
      .use(tokenAmount, minTezOut)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTezPayment(tokenAmount, minTezOut, receiver) {
    await this.approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTezPayment(tokenAmount, minTezOut, receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenSwap(tokenAmount, minTokensOut, tokenAddress) {
    await this.approve(tokenAmount);
    const operation = await this.contract.methods
      .tokenToTokenSwap(tokenAmount, minTokensOut, tokenAddress)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenPayment(tokenAmount, minTokensOut, tokenAddress, receiver) {
    await this.approve(tokenAmount);
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

    let dex = await Dex.init(await setup());
    await dex.prepare();
  });

  describe('InitializeExchange()', function () {
    it('should initialize exchange', async function () {
      this.timeout(1000000);
      let Tezos = await setup();
      let dex = await Dex.init(Tezos);
      const tokenAmount = "1000";
      const tezAmount = "1.0";
      const pkh = await Tezos.signer.publicKeyHash();
      let initialStorage = await dex.getFullStorage({ shares: [pkh] });
      assert(initialStorage.feeRate == 500);
      assert(initialStorage.invariant == 0);
      assert(initialStorage.totalShares == 0);
      assert(initialStorage.tezPool == 0);
      assert(initialStorage.tokenPool == 0);
      assert(initialStorage.tokenAddress == tokenAddress);
      assert(initialStorage.factoryAddress == factoryAddress);
      assert(initialStorage.sharesExtended[pkh] == undefined);

      let operation = await dex.initializeExchange(tokenAmount, tezAmount);
      assert(operation.status === "applied", "Operation was not applied");

      let finalStorage = await dex.getFullStorage({ shares: [pkh] });

      const mutezAmount = parseFloat(tezAmount) * 1000000;
      assert(finalStorage.feeRate == 500);
      assert(finalStorage.invariant == mutezAmount * parseInt(tokenAmount));
      assert(finalStorage.tezPool == mutezAmount);
      assert(finalStorage.tokenPool == tokenAmount);
      assert(finalStorage.tokenAddress == tokenAddress);
      assert(finalStorage.factoryAddress == factoryAddress);
      assert(finalStorage.sharesExtended[pkh] == 1000);
      assert(finalStorage.totalShares == 1000);
    });
  });

  describe('InvestLiquidity()', function () {
    it('should invest liquidity', async function () {
      this.timeout(1000000);
      let Tezos = await setup("../key1");
      let dex = await Dex.init(Tezos);
      let tezAmount = "5.0";
      const pkh = await Tezos.signer.publicKeyHash();
      let initialStorage = await dex.getFullStorage({ shares: [pkh] });

      const mutezAmount = parseFloat(tezAmount) * 1000000;
      const minShares = parseInt(
        (mutezAmount / initialStorage.tezPool) * initialStorage.totalShares
      );
      const tokenAmount = parseInt(
        (minShares * initialStorage.tokenPool) / initialStorage.totalShares
      );

      let operation = await dex.investLiquidity(tokenAmount, tezAmount, minShares)
      assert(operation.status === "applied", "Operation was not applied");
      let finalStorage = await dex.getFullStorage({ shares: [pkh] });

      assert(finalStorage.sharesExtended[pkh] == minShares);
      assert(
        finalStorage.tezPool ==
        parseInt(initialStorage.tezPool) + parseInt(mutezAmount)
      );
      assert(
        finalStorage.tokenPool ==
        parseInt(initialStorage.tokenPool) + parseInt(tokenAmount)
      );
      assert(
        finalStorage.totalShares ==
        parseInt(initialStorage.totalShares) + parseInt(minShares)
      );
      assert(
        finalStorage.invariant ==
        (parseInt(initialStorage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialStorage.tokenPool) + parseInt(tokenAmount))
      );

    });
  });

  describe('TezToTokenSwap()', function () {
    it('should exchange tez to token', async function () {
      this.timeout(1000000);
      let Tezos = await setup();
      let dex = await Dex.init(Tezos);
      let tezAmount = "0.01";
      const pkh = await Tezos.signer.publicKeyHash();
      const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
      const initialTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh] });
      const initialTezBalance = await Tezos.tz.getBalance(pkh);

      const mutezAmount = parseFloat(tezAmount) * 1000000;

      const fee = parseInt(mutezAmount / initialDexStorage.feeRate);
      const newTezPool = parseInt(+initialDexStorage.tezPool + +mutezAmount);
      const tempTezPool = parseInt(newTezPool - fee);
      const newTokenPool = parseInt(initialDexStorage.invariant / tempTezPool);

      const minTokens = parseInt(
        parseInt(initialDexStorage.tokenPool - newTokenPool)
      );


      let operation = await dex.tezToTokenSwap(minTokens, tezAmount)
      assert(operation.status === "applied", "Operation was not applied");
      let finalStorage = await dex.getFullStorage({ shares: [pkh] });

      const finalTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh] });
      const finalTezBalance = await Tezos.tz.getBalance(pkh);

      assert(
        finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) + parseInt(minTokens)
      );
      assert(finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount));
      assert(
        finalStorage.tezPool ==
        parseInt(initialDexStorage.tezPool) + parseInt(mutezAmount)
      );
      assert(
        finalStorage.tokenPool ==
        parseInt(initialDexStorage.tokenPool) - parseInt(minTokens)
      );

      assert(
        finalStorage.invariant ==
        (parseInt(initialDexStorage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialDexStorage.tokenPool) - parseInt(minTokens))
      );
    });
  });

  describe('TokenToTezSwap()', function () {
    it('should exchange tez to token', async function () {
      this.timeout(1000000);
      let Tezos = await setup();
      let dex = await Dex.init(Tezos);
      let tokensIn = "1000";
      const pkh = await Tezos.signer.publicKeyHash();

      const initialTezBalance = await Tezos.tz.getBalance(pkh);
      const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
      const initialTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh] });

      const fee = parseInt(tokensIn / initialDexStorage.feeRate);
      const newTokenPool = parseInt(+initialDexStorage.tokenPool + +tokensIn);
      const tempTokenPool = parseInt(newTokenPool - fee);
      const newTezPool = parseInt(initialDexStorage.invariant / tempTokenPool);

      const minTezOut = parseInt(parseInt(initialDexStorage.tezPool - newTezPool));
      let operation = await dex.tokenToTezSwap(tokensIn, minTezOut)
      assert(operation.status === "applied", "Operation was not applied");
      let finalStorage = await dex.getFullStorage({ shares: [pkh] });

      const finalTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh] });
      const finalTezBalance = await Tezos.tz.getBalance(pkh);

      assert(
        finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) - parseInt(tokensIn)
      );
      assert(finalTezBalance >= parseInt(initialTezBalance));
      assert(finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut));
      assert(
        finalStorage.tezPool ==
        parseInt(initialDexStorage.tezPool) - parseInt(minTezOut)
      );
      assert(
        finalStorage.tokenPool ==
        parseInt(initialDexStorage.tokenPool) + parseInt(tokensIn)
      );

      assert(
        finalStorage.invariant ==
        (parseInt(initialDexStorage.tezPool) - parseInt(minTezOut)) *
        (parseInt(initialDexStorage.tokenPool) + parseInt(tokensIn))
      );
    });
  });

  describe('TezToTokenPayment()', function () {
    it('should exchange tez to token and send to requested address', async function () {
      this.timeout(1000000);
      let Tezos = await setup();
      let Tezos1 = await setup("../key1");
      let dex = await Dex.init(Tezos);
      let tezAmount = "0.1";
      const pkh = await Tezos.signer.publicKeyHash();
      const pkh1 = await Tezos1.signer.publicKeyHash();
      const initialDexStorage = await dex.getFullStorage({ shares: [pkh, pkh1] });
      const initialTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh, pkh1] });
      const initialTezBalance = await Tezos.tz.getBalance(pkh);

      const mutezAmount = parseFloat(tezAmount) * 1000000;

      const fee = parseInt(mutezAmount / initialDexStorage.feeRate);
      const newTezPool = parseInt(+initialDexStorage.tezPool + +mutezAmount);
      const tempTezPool = parseInt(newTezPool - fee);
      const newTokenPool = parseInt(initialDexStorage.invariant / tempTezPool);

      const minTokens = parseInt(
        parseInt(initialDexStorage.tokenPool - newTokenPool)
      );


      let operation = await dex.tezToTokenPayment(minTokens, tezAmount, pkh1)
      assert(operation.status === "applied", "Operation was not applied");
      let finalStorage = await dex.getFullStorage({ shares: [pkh] });

      const finalTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh1] });
      const finalTezBalance = await Tezos.tz.getBalance(pkh);

      assert(
        finalTokenStorage.ledgerExtended[pkh1].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh1].balance) + parseInt(minTokens)
      );
      assert(finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount));
      assert(
        finalStorage.tezPool ==
        parseInt(initialDexStorage.tezPool) + parseInt(mutezAmount)
      );
      assert(
        finalStorage.tokenPool ==
        parseInt(initialDexStorage.tokenPool) - parseInt(minTokens)
      );

      assert(
        finalStorage.invariant ==
        (parseInt(initialDexStorage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialDexStorage.tokenPool) - parseInt(minTokens))
      );
    });
  });

  // describe('TokenToTezPayment()', function () {
  //   it('should exchange tez to token', async function () {
  //     this.timeout(1000000);
  //     let Tezos = await setup();
  //     let Tezos1 = await setup("../key1");
  //     let dex = await Dex.init(Tezos);
  //     let tokensIn = "1000";
  //     const pkh = await Tezos.signer.publicKeyHash();
  //     const pkh1 = await Tezos1.signer.publicKeyHash();

  //     const initialTezBalance = await Tezos.tz.getBalance(pkh1);
  //     const initialDexStorage = await dex.getFullStorage({ shares: [pkh, pkh1] });
  //     const initialTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh, pkh1] });

  //     const fee = parseInt(tokensIn / initialDexStorage.feeRate);
  //     const newTokenPool = parseInt(+initialDexStorage.tokenPool + +tokensIn);
  //     const tempTokenPool = parseInt(newTokenPool - fee);
  //     const newTezPool = parseInt(initialDexStorage.invariant / tempTokenPool);

  //     const minTezOut = parseInt(parseInt(initialDexStorage.tezPool - newTezPool));
  //     let operation = await dex.tokenToTezPayment(tokensIn, minTezOut, pkh1)
  //     assert(operation.status === "applied", "Operation was not applied");
  //     let finalStorage = await dex.getFullStorage({ shares: [pkh] });

  //     const finalTokenStorage = await getContractFullStorage(Tezos, tokenAddress, { ledger: [pkh, pkh1] });
  //     const finalTezBalance = await Tezos.tz.getBalance(pkh1);

  //     assert(
  //       finalTokenStorage.ledgerExtended[pkh].balance ==
  //       parseInt(initialTokenStorage.ledgerExtended[pkh].balance) - parseInt(tokensIn)
  //     );
  //     assert(finalTezBalance >= parseInt(initialTezBalance));
  //     assert(finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut));
  //     assert(
  //       finalStorage.tezPool ==
  //       parseInt(initialDexStorage.tezPool) - parseInt(minTezOut)
  //     );
  //     assert(
  //       finalStorage.tokenPool ==
  //       parseInt(initialDexStorage.tokenPool) + parseInt(tokensIn)
  //     );

  //     assert(
  //       finalStorage.invariant ==
  //       (parseInt(initialDexStorage.tezPool) - parseInt(minTezOut)) *
  //       (parseInt(initialDexStorage.tokenPool) + parseInt(tokensIn))
  //     );
  //   });
  // });

  // describe('DivestLiquidity()', function () {
  //   it('should divest liquidity', async function () {
  //     this.timeout(1000000);
  //     let Tezos = await setup("../key1");
  //     let dex = await Dex.init(Tezos);
  //     let sharesBurned = 10;
  //     const pkh = await Tezos.signer.publicKeyHash();
  //     let initialStorage = await dex.getFullStorage({ shares: [pkh] });

  //     const tezPerShare = parseInt(
  //       initialStorage.tezPool / initialStorage.totalShares
  //     );
  //     const tokensPerShare = parseInt(
  //       initialStorage.tokenPool / initialStorage.totalShares
  //     );
  //     const minTez = tezPerShare * sharesBurned;
  //     const minTokens = tokensPerShare * sharesBurned;
  //     let operation = await dex.divestLiquidity(minTokens, minTez, sharesBurned)
  //     assert(operation.status === "applied", "Operation was not applied");
  //     let finalStorage = await dex.getFullStorage({ shares: [pkh] });

  //     assert(
  //       finalStorage.sharesExtended[pkh] ==
  //       initialStorage.sharesExtended[pkh] - sharesBurned
  //     );
  //     assert(finalStorage.tezPool == parseInt(initialStorage.tezPool) - minTez);
  //     assert(
  //       finalStorage.tokenPool == parseInt(initialStorage.tokenPool) - minTokens
  //     );
  //     assert(
  //       finalStorage.totalShares ==
  //       parseInt(initialStorage.totalShares) - sharesBurned
  //     );
  //     assert(
  //       finalStorage.invariant ==
  //       (parseInt(initialStorage.tezPool) - minTez) *
  //       (parseInt(initialStorage.tokenPool) - minTokens)
  //     );
  //   });
  // });
});


// | TokenToTokenSwap of (nat * nat * address)
// | TokenToTokenPayment of (nat * nat * address * address)
// | SetVotesDelegation of (address * bool)
// | Vote of (address * key_hash)
// | Veto of (address)


