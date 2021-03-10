const standard = process.env.EXCHANGE_TOKEN_STANDARD;
let Factory = artifacts.require("Factory" + standard);
let TestFactory = artifacts.require("TestFactory" + standard);
const factoryStorage = require("../storage/Factory");
const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { dexFunctions, tokenFunctions } = require("../storage/Functions");
const { execSync } = require("child_process");
const Token = artifacts.require("Token" + standard);
const tokenStorage = require("../storage/Token" + standard);
const { getLigo } = require("../scripts/utils");
const accountsStored = require("../scripts/sandbox/accounts");
let prefix = "";

module.exports = async (deployer, network, accounts) => {
  /* skip deployment for tests */
  if (network === "development") return;

  /* fix outdated Taquito version in Truffle */
  tezos = new TezosToolkit(tezos.rpc.url);
  const secretKey = accountsStored.alice.sk.trim();
  tezos.setProvider({
    config: {
      confirmationPollingTimeoutSecond: 500,
    },
    signer: await InMemorySigner.fromSecretKey(secretKey),
  });

  /* deploy factory of dex pairs */
  await deployer.deploy(Factory, factoryStorage);
  let factoryInstance = await Factory.deployed();
  console.log(`Factory address: ${factoryInstance.address}`);

  /* get ligo path */
  let ligo = getLigo(true);

  /* store dex pair methods as lambdas in the factory; 
  the code will be copied the dex storage during origination as well */
  for (dexFunction of dexFunctions) {
    /* compiling parametters for storing lambdas in the Factory contract;
    taquito can't read ligo code and prepare arguments for the call */
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/${prefix}Factory${standard}.ligo main 'SetDexFunction(record index =${dexFunction.index}n; func = ${dexFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );

    /* prepare and broadcast transaction */
    const operation = await tezos.contract.transfer({
      to: factoryInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0],
      },
    });
    await operation.confirmation();
  }

  /* store dex pair methods as lambdas in the factory; 
  the code will be copied the dex storage during origination as well */
  for (tokenFunction of tokenFunctions[standard]) {
    /* compiling parametters for storing lambdas in the Factory contract;
    taquito can't read ligo code and prepare arguments for the call */
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/${prefix}Factory${standard}.ligo main 'SetTokenFunction(record index =${tokenFunction.index}n; func = ${tokenFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    /* prepare and broadcast transaction */
    const operation = await tezos.contract.transfer({
      to: factoryInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0],
      },
    });
    await operation.confirmation();
  }

  /* deploy test tokens and dex pairs */
  if (network !== "mainnet") {
    /* originate token with Truffle;
    and initialize the contract instance with updated taquito */
    let token0Instance = await tezos.contract.at(
      (await Token.new(tokenStorage)).address.toString()
    );
    /* originate token with Truffle;
    and initialize the contract instance with updated taquito */
    let token1Instance = await tezos.contract.at(
      (await Token.new(tokenStorage)).address.toString()
    );
    console.log(`Token 1 address: ${token0Instance.address}`);
    console.log(`Token 2 address: ${token1Instance.address}`);
    let tezAmount = 1;
    let tokenAmount = 1000000;
    if (standard === "FA12") {
      /* approve the first token that will pe provided as the 
      initial liquidity on the first exchange pair */
      let operation = await token0Instance.methods
        .approve(factoryInstance.address.toString(), tokenAmount)
        .send();
      await operation.confirmation();
      /* approve the second token that will pe provided as the 
      initial liquidity on the second exchange pair */
      operation = await token1Instance.methods
        .approve(factoryInstance.address.toString(), tokenAmount)
        .send();
      await operation.confirmation();
      /* originate the first exchange pair */
      await factoryInstance.launchExchange(
        token0Instance.address.toString(),
        tokenAmount,
        { amount: tezAmount }
      );
      /* originate the second exchange pair */
      await factoryInstance.launchExchange(
        token1Instance.address.toString(),
        tokenAmount,
        { amount: tezAmount }
      );
    } else {
      let defaultTokenId = 0;
      /* approve the first token that will pe provided as the 
      initial liquidity on the first exchange pair */
      let operation = await token0Instance.methods
        .update_operators([
          {
            add_operator: {
              owner: accounts[0],
              operator: factoryInstance.address.toString(),
              token_id: defaultTokenId,
            },
          },
        ])
        .send();
      await operation.confirmation();
      /* approve the second token that will pe provided as the 
      initial liquidity on the second exchange pair */
      operation = await token1Instance.methods
        .update_operators([
          {
            add_operator: {
              owner: accounts[0],
              operator: factoryInstance.address.toString(),
              token_id: defaultTokenId,
            },
          },
        ])
        .send();
      await operation.confirmation();
      /* originate the first exchange pair */
      await factoryInstance.launchExchange(
        token0Instance.address.toString(),
        defaultTokenId,
        tokenAmount,
        { amount: tezAmount }
      );
      /* originate the second exchange pair;
      the operation fails with the storage_error */
      await factoryInstance.launchExchange(
        token1Instance.address.toString(),
        defaultTokenId,
        tokenAmount,
        { amount: tezAmount }
      );
    }
  }
};
