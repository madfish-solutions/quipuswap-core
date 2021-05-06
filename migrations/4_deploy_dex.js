const standard = process.env.EXCHANGE_TOKEN_STANDARD;
const Factory = artifacts.require("Factory" + standard);
const MetadataStorage = artifacts.require("MetadataStorage");
const factoryStorage = require("../storage/Factory");
const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { MichelsonMap } = require("@taquito/michelson-encoder");
const { dexFunctions, tokenFunctions } = require("../storage/Functions");
const { execSync } = require("child_process");
const Token = artifacts.require("Token" + standard);
const tokenStorage = require("../storage/Token" + standard);
const { getLigo } = require("../scripts/utils");
const accountsStored = require("../scripts/sandbox/accounts");
const BakerRegistry = artifacts.require("BakerRegistry");
const { confirmOperation } = require("./confirmation");

const initialTezAmount = 1;
const initialTokenAmount = 1000000;
const defaultTokenId = 0;

module.exports = async (deployer, network, accounts) => {
  tezos = new TezosToolkit(tezos.rpc.url);
  if (network === "development") return;
  const secretKey = accountsStored.alice.sk.trim();
  tezos.setProvider({
    config: {
      confirmationPollingTimeoutSecond: 500,
    },
    signer: await InMemorySigner.fromSecretKey(secretKey),
  });

  const metadataStorageInstance = await MetadataStorage.deployed();
  factoryStorage.baker_validator = (
    await BakerRegistry.deployed()
  ).address.toString();
  factoryStorage.metadata = MichelsonMap.fromLiteral({
    "": Buffer(
      "tezos-storage://" +
        metadataStorageInstance.address.toString() +
        "/quipu",
      "ascii"
    ).toString("hex"),
  });
  await deployer.deploy(Factory, factoryStorage);
  const factoryInstance = await Factory.deployed();
  console.log(`Factory address: ${factoryInstance.address}`);

  const ligo = getLigo(true);

  for (dexFunction of dexFunctions) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory${standard}.ligo main 'SetDexFunction(record index =${dexFunction.index}n; func = ${dexFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: factoryInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }
  for (tokenFunction of tokenFunctions[standard]) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory${standard}.ligo main 'SetTokenFunction(record index =${tokenFunction.index}n; func = ${tokenFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: factoryInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  if (network !== "mainnet") {
    let token0Instance = await tezos.contract.at(
      (await Token.new(tokenStorage)).address.toString()
    );
    let token1Instance = await tezos.contract.at(
      (await Token.new(tokenStorage)).address.toString()
    );
    console.log(`Token 1 address: ${token0Instance.address}`);
    console.log(`Token 2 address: ${token1Instance.address}`);

    if (standard === "FA12") {
      let operation = await token0Instance.methods
        .approve(factoryInstance.address.toString(), initialTokenAmount)
        .send();
      await confirmOperation(tezos, operation.hash);
      operation = await token1Instance.methods
        .approve(factoryInstance.address.toString(), initialTokenAmount)
        .send();
      await confirmOperation(tezos, operation.hash);
      await factoryInstance.launchExchange(
        token0Instance.address.toString(),
        initialTokenAmount,
        { amount: initialTezAmount }
      );
      await factoryInstance.launchExchange(
        token1Instance.address.toString(),
        initialTokenAmount,
        { amount: initialTezAmount }
      );
    } else {
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
      await confirmOperation(tezos, operation.hash);
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
      await confirmOperation(tezos, operation.hash);
      operation = await factoryInstance.launchExchange(
        token0Instance.address.toString(),
        defaultTokenId,
        initialTokenAmount,
        { amount: initialTezAmount }
      );
      await confirmOperation(tezos, operation.hash);
      operation = await factoryInstance.launchExchange(
        token1Instance.address.toString(),
        defaultTokenId,
        initialTokenAmount,
        { amount: initialTezAmount }
      );
      await confirmOperation(tezos, operation.hash);
    }
  }
};
