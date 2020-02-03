const { TezosToolkit } = require("@taquito/taquito");
const fs = require("fs");
const assert = require("assert");
const BigNumber = require("bignumber.js");
const { address: tokenAddress } = JSON.parse(
  fs.readFileSync("./deployed/Token.json").toString()
);
const { address: dexAddress } = JSON.parse(
  fs.readFileSync("./deployed/Dex.json").toString()
);
const { address: factoryAddress, network } = JSON.parse(
  fs.readFileSync("./deployed/Factory.json").toString()
);

const getTokenFullStorage = async (address, keys) => {
  const { Tezos1 } = await getAccounts();
  const contract = await Tezos1.contract.at(address);
  const storage = await contract.storage();
  const accounts = await keys.reduce(async (prev, current) => {
    const value = await prev;

    let entry = {
      balance: new BigNumber(0),
      allowances: {}
    };

    try {
      entry = await storage.ledger.get(current);
    } catch (ex) {
      console.error(ex);
      // Do nothing
    }

    return {
      ...value,
      [current]: entry
    };
  }, Promise.resolve({}));
  return {
    ...storage,
    accounts
  };
};

const getDexFullStorage = async (address, keys) => {
  const { Tezos1 } = await getAccounts();
  const contract = await Tezos1.contract.at(address);
  const storage = await contract.storage();
  const extendedShares = await keys.reduce(async (prev, current) => {
    const value = await prev;

    let entry = new BigNumber(0);

    try {
      entry = storage.shares[current]; //await storage.shares.get(current);
    } catch (ex) {
      console.error(ex);
    }

    return {
      ...value,
      [current]: entry
    };
  }, Promise.resolve({}));
  return {
    ...storage,
    extendedShares
  };
};

const createTezosFromFaucet = async path => {
  const { email, password, mnemonic, secret } = JSON.parse(
    fs.readFileSync(path).toString()
  );
  const Tezos = new TezosToolkit();
  Tezos.setProvider({ rpc: network, confirmationPollingTimeoutSecond: 300 });
  await Tezos.importKey(email, password, mnemonic.join(" "), secret);
  return Tezos;
};

const getAccounts = async () => {
  const Tezos1 = await createTezosFromFaucet("./faucet.json");
  const Tezos2 = await createTezosFromFaucet("./faucet2.json");
  return { Tezos1, Tezos2 };
};

const testInitializeDex = async (tokenAmount = "1000", tezAmount = "1.0") => {
  const { Tezos1 } = await getAccounts();

  const pkh = await Tezos1.signer.publicKeyHash();
  const initialStorage = await getDexFullStorage(dexAddress, [pkh]);

  assert(initialStorage.feeRate == 500);
  assert(initialStorage.invariant == 0);
  assert(initialStorage.totalShares == 0);
  assert(initialStorage.tezPool == 0);
  assert(initialStorage.tokenPool == 0);
  assert(initialStorage.tokenAddress == tokenAddress);
  assert(initialStorage.factoryAddress == factoryAddress);
  assert(initialStorage.extendedShares[pkh] == undefined);

  const tokenContract = await Tezos1.contract.at(tokenAddress);
  const dexContract = await Tezos1.contract.at(dexAddress);

  const operation0 = await tokenContract.methods
    .approve(dexAddress, tokenAmount)
    .send();
  await operation0.confirmation();

  // TODO: add token check

  assert(operation0.status === "applied", "Operation was not applied");

  const operation1 = await dexContract.methods
    .initializeExchange(tokenAmount)
    .send({ amount: tezAmount });
  await operation1.confirmation();

  assert(operation1.status === "applied", "Operation was not applied");

  const finalStorage = await getDexFullStorage(dexAddress, [pkh]);

  const mutezAmount = parseFloat(tezAmount) * 1000000;
  assert(finalStorage.feeRate == 500);
  assert(finalStorage.invariant == mutezAmount * parseInt(tokenAmount));
  assert(finalStorage.tezPool == mutezAmount);
  assert(finalStorage.tokenPool == tokenAmount);
  assert(finalStorage.tokenAddress == tokenAddress);
  assert(finalStorage.factoryAddress == factoryAddress);
  assert(finalStorage.extendedShares[pkh] == 1000);
  assert(finalStorage.totalShares == 1000);
  // TODO: add token check
};

const testInvestLiquidity = async (tezAmount = "5.0") => {
  const { Tezos1, Tezos2 } = await getAccounts();

  const pkh0 = await Tezos1.signer.publicKeyHash();
  const pkh = await Tezos2.signer.publicKeyHash();
  const initialStorage = await getDexFullStorage(dexAddress, [pkh]);

  assert(initialStorage.extendedShares[pkh] == undefined);

  const tokenContract0 = await Tezos1.contract.at(tokenAddress);
  const tokenContract = await Tezos2.contract.at(tokenAddress);
  const dexContract = await Tezos2.contract.at(dexAddress);

  const mutezAmount = parseFloat(tezAmount) * 1000000;
  const minShares = parseInt(
    (mutezAmount / initialStorage.tezPool) * initialStorage.totalShares
  );
  const tokenAmount = parseInt(
    (minShares * initialStorage.tokenPool) / initialStorage.totalShares
  );

  const operation0 = await tokenContract0.methods
    .transfer(pkh0, pkh, tokenAmount)
    .send();
  await operation0.confirmation();

  assert(operation0.status === "applied", "Operation was not applied");

  const operation1 = await tokenContract.methods
    .approve(dexAddress, tokenAmount)
    .send();
  await operation1.confirmation();

  // TODO: add token check

  assert(operation1.status === "applied", "Operation was not applied");

  const operation2 = await dexContract.methods
    .investLiquidity(minShares)
    .send({ amount: tezAmount });
  await operation2.confirmation();

  assert(operation2.status === "applied", "Operation was not applied");

  const finalStorage = await getDexFullStorage(dexAddress, [pkh]);

  assert(finalStorage.extendedShares[pkh] == minShares);
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
  // TODO: add token check
};
const expectThrow = async fn => {
  let throwed = false;
  try {
    await fn();
  } catch (ex) {
    throwed = true;
  }

  if (!throwed) {
    throw new Error("Exepected step to throw error");
  }
};

const assertInvariant = async testFn => {
  //   const { Tezos1, Tezos2, manager } = await getAccounts();
  //   const pkh = await Tezos1.signer.publicKeyHash();
  //   const pkh2 = await Tezos2.signer.publicKeyHash();
  await testFn();
  //   const finalStorage = await getFullStorage(address, [
  //     pkh,
  //     pkh2,
  //     manager.address
  //   ]);
  //   const totalSupply = Object.keys(finalStorage.accounts).reduce(
  //     (prev, current) => prev + finalStorage.accounts[current].balance.toNumber(),
  //     0
  //   );
  //   assert(
  //     totalSupply === finalStorage.totalSupply.toNumber(),
  //     `Expected ${totalSupply} to be ${finalStorage.totalSupply.toNumber()}`
  //   );
};

const test = async () => {
  const tests = [() => testInitializeDex(), () => testInvestLiquidity()];

  for (let test of tests) {
    await assertInvariant(test);
  }
};

try {
  test().catch(console.log);
} catch (ex) {
  console.log(ex);
}
