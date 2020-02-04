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
      entry = storage.ledger[current]; // await storage.ledger.get(current);
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

const testTezToTokenSwap = async (tezAmount = "0.01") => {
  const { Tezos1 } = await getAccounts();

  const pkh = await Tezos1.signer.publicKeyHash();
  const initialTokenStorage = await getTokenFullStorage(tokenAddress, [pkh]);
  const initialDexStorage = await getDexFullStorage(dexAddress, [pkh]);
  const initialTezBalance = await Tezos1.tz.getBalance(pkh);
  const dexContract = await Tezos1.contract.at(dexAddress);

  const mutezAmount = parseFloat(tezAmount) * 1000000;

  const fee = parseInt(mutezAmount / initialDexStorage.feeRate);
  const newTezPool = parseInt(+initialDexStorage.tezPool + +mutezAmount);
  const tempTezPool = parseInt(newTezPool - fee);
  const newTokenPool = parseInt(initialDexStorage.invariant / tempTezPool);

  const minTokens = parseInt(
    parseInt(initialDexStorage.tokenPool - newTokenPool)
  );

  const operation0 = await dexContract.methods
    .tezToTokenSwap(minTokens.toString())
    .send({
      amount: tezAmount
    });
  await operation0.confirmation();

  assert(operation0.status === "applied", "Operation was not applied");
  const finalStorage = await getDexFullStorage(dexAddress, [pkh]);
  const finalTokenStorage = await getTokenFullStorage(tokenAddress, [pkh]);
  const finalTezBalance = await Tezos1.tz.getBalance(pkh);

  assert(
    finalTokenStorage.accounts[pkh].balance ==
      parseInt(initialTokenStorage.accounts[pkh].balance) + parseInt(minTokens)
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
  // TODO: add token check
};

const testTokenToTezSwap = async (tokensIn = "1000") => {
  const { Tezos1 } = await getAccounts();

  const pkh = await Tezos1.signer.publicKeyHash();
  const initialTokenStorage = await getTokenFullStorage(tokenAddress, [pkh]);
  const initialDexStorage = await getDexFullStorage(dexAddress, [pkh]);
  const initialTezBalance = await Tezos1.tz.getBalance(pkh);
  const dexContract = await Tezos1.contract.at(dexAddress);
  const tokenContract = await Tezos1.contract.at(tokenAddress);

  const fee = parseInt(tokensIn / initialDexStorage.feeRate);
  const newTokenPool = parseInt(+initialDexStorage.tokenPool + +tokensIn);
  const tempTokenPool = parseInt(newTokenPool - fee);
  const newTezPool = parseInt(initialDexStorage.invariant / tempTokenPool);

  const minTezOut = parseInt(parseInt(initialDexStorage.tezPool - newTezPool));

  const operation0 = await tokenContract.methods
    .approve(dexAddress, tokensIn)
    .send();
  await operation0.confirmation();

  // TODO: add token check

  assert(operation0.status === "applied", "Operation was not applied");

  const operation1 = await dexContract.methods
    .tokenToTezSwap(tokensIn, minTezOut.toString())
    .send();
  await operation1.confirmation();

  assert(operation1.status === "applied", "Operation was not applied");

  const finalStorage = await getDexFullStorage(dexAddress, [pkh]);
  const finalTokenStorage = await getTokenFullStorage(tokenAddress, [pkh]);
  const finalTezBalance = await Tezos1.tz.getBalance(pkh);

  assert(
    finalTokenStorage.accounts[pkh].balance ==
      parseInt(initialTokenStorage.accounts[pkh].balance) - parseInt(tokensIn)
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
  // TODO: add token check
};

const testTezToTokenPayment = async (tezAmount = "0.1") => {
  const { Tezos1, Tezos2 } = await getAccounts();

  const pkh = await Tezos1.signer.publicKeyHash();
  const pkh1 = await Tezos2.signer.publicKeyHash();
  const initialTokenStorage = await getTokenFullStorage(tokenAddress, [
    pkh,
    pkh1
  ]);
  const initialDexStorage = await getDexFullStorage(dexAddress, [pkh, pkh1]);
  const initialTezBalance = await Tezos1.tz.getBalance(pkh);
  const dexContract = await Tezos1.contract.at(dexAddress);

  const mutezAmount = parseFloat(tezAmount) * 1000000;

  const fee = parseInt(mutezAmount / initialDexStorage.feeRate);
  const newTezPool = parseInt(+initialDexStorage.tezPool + +mutezAmount);
  const tempTezPool = parseInt(newTezPool - fee);
  const newTokenPool = parseInt(initialDexStorage.invariant / tempTezPool);

  const minTokens = parseInt(
    parseInt(initialDexStorage.tokenPool - newTokenPool)
  );

  const operation0 = await dexContract.methods
    .tezToTokenPayment(minTokens.toString(), pkh1)
    .send({
      amount: tezAmount
    });
  await operation0.confirmation();

  assert(operation0.status === "applied", "Operation was not applied");
  const finalStorage = await getDexFullStorage(dexAddress, [pkh, pkh1]);
  const finalTokenStorage = await getTokenFullStorage(tokenAddress, [
    pkh,
    pkh1
  ]);
  const finalTezBalance = await Tezos1.tz.getBalance(pkh);

  assert(
    finalTokenStorage.accounts[pkh1].balance ==
      parseInt(initialTokenStorage.accounts[pkh1].balance) + parseInt(minTokens)
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
  await testFn();
};

const test = async () => {
  const tests = [
    () => testInitializeDex(),
    () => testInvestLiquidity(),
    () => testTezToTokenSwap(),
    () => testTezToTokenPayment(),
    () => testTokenToTezSwap()
  ];

  for (let test of tests) {
    await assertInvariant(test);
  }
};

try {
  test().catch(console.log);
} catch (ex) {
  console.log(ex);
}
