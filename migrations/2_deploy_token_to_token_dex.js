const standard = process.env.EXCHANGE_TOKEN_STANDARD;
const TTDex = artifacts.require("TTDex" + standard);
const MetadataStorage = artifacts.require("MetadataStorage");
const dexStorage = require("../storage/TTDex");
const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { MichelsonMap } = require("@taquito/michelson-encoder");
const { dexFunctions, tokenFunctions } = require("../storage/TTFunctions");
const { execSync } = require("child_process");
const Token = artifacts.require("Token" + standard);
const tokenStorage = require("../storage/Token" + standard);
const { getLigo } = require("../scripts/utils");
const accountsStored = require("../scripts/sandbox/accounts");

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
  dexStorage.metadata = MichelsonMap.fromLiteral({
    "": Buffer(
      "tezos-storage://" +
        metadataStorageInstance.address.toString() +
        "/quipu",
      "ascii"
    ).toString("hex"),
  });
  await deployer.deploy(TTDex, dexStorage);
  const dexInstance = await TTDex.deployed();
  console.log(`TTDex address: ${dexInstance.address}`);

  const ligo = getLigo(true);

  for (dexFunction of dexFunctions) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TTDex${standard}.ligo main 'SetDexFunction(record index =${dexFunction.index}n; func = ${dexFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: dexInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0],
      },
    });
    await operation.confirmation();
  }
  for (tokenFunction of tokenFunctions[standard]) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TTDex${standard}.ligo main 'SetTokenFunction(record index =${tokenFunction.index}n; func = ${tokenFunction.name}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: dexInstance.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0],
      },
    });
    await operation.confirmation();
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

    const dex = await tezos.contract.at(dexInstance.address.toString());
    const ordered =
      token0Instance.address.toString() < token1Instance.address.toString();
    if (standard === "FA12") {
      let operation = await token0Instance.methods
        .approve(dexInstance.address.toString(), initialTokenAmount)
        .send();
      await operation.confirmation();
      operation = await token1Instance.methods
        .approve(dexInstance.address.toString(), initialTokenAmount)
        .send();
      await operation.confirmation();

      operation = await dex.methods
        .use(
          "initializeExchange",
          ordered
            ? token0Instance.address.toString()
            : token1Instance.address.toString(),
          ordered
            ? token1Instance.address.toString()
            : token0Instance.address.toString(),
          initialTokenAmount,
          initialTokenAmount
        )
        .send();
      await operation.confirmation();
    } else {
      let operation = await token0Instance.methods
        .update_operators([
          {
            add_operator: {
              owner: accounts[0],
              operator: dexInstance.address.toString(),
              token_id: defaultTokenId,
            },
          },
        ])
        .send();
      await operation.confirmation();
      operation = await token1Instance.methods
        .update_operators([
          {
            add_operator: {
              owner: accounts[0],
              operator: dexInstance.address.toString(),
              token_id: defaultTokenId,
            },
          },
        ])
        .send();
      await operation.confirmation();
      let pair = {
        token_a_address: token0Instance.address.toString(),
        token_b_address: token1Instance.address.toString(),
        token_a_id: 0,
        token_b_id: 0,
      };
      operation = await dex.methods
        .use(
          "initializeExchange",
          ordered
            ? token0Instance.address.toString()
            : token1Instance.address.toString(),
          0,
          ordered
            ? token1Instance.address.toString()
            : token0Instance.address.toString(),
          0,
          initialTokenAmount,
          initialTokenAmount
        )
        .send();
      await operation.confirmation();
    }
  }
};
