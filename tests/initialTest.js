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
      entry = await storage.shares.get(current);
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

const testInitializeDex = async (tokenAmount = "1000", tezAmount = "1") => {
  const { Tezos1 } = await getAccounts();

  const pkh = await Tezos1.signer.publicKeyHash();
  const initialStorage = await getDexFullStorage(dexAddress, [pkh]);

  const dexContract = await Tezos1.contract.at(dexAddress);

  const operation = await dexContract.methods
    .initializeExchange(tokenAmount)
    .send(tezAmount);
  await operation.confirmation();

  assert(operation.status === "applied", "Operation was not applied");

  //   const finalStorage = await getFullStorage(address, [pkh, pkh2]);

  //   assert(
  //     initialStorage.accounts[pkh].balance.toString() ===
  //       finalStorage.accounts[pkh].balance.plus(amount).toString()
  //   );
  //   assert(
  //     initialStorage.accounts[pkh2].balance.toString() ===
  //       finalStorage.accounts[pkh2].balance.minus(amount).toString()
  //   );
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
  const tests = [() => testInitializeDex()];

  for (let test of tests) {
    await assertInvariant(test);
  }
};

try {
  test().catch(console.log);
} catch (ex) {
  console.log(ex);
}
