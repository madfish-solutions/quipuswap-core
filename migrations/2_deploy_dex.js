const standard = process.env.npm_package_config_standard;
let Factory = artifacts.require("Factory" + standard);
let TestFactory = artifacts.require("TestFactory" + standard);
const factoryStorage = require("../storage/Factory");
const { dexFunctions, tokenFunctions } = require("../storage/Functions");
const { execSync } = require("child_process");
const Token = artifacts.require("Token" + standard);
const tokenStorage = require("../storage/Token" + standard);
let prefix = "";
function getLigo(isDockerizedLigo) {
  let path = "ligo";
  if (isDockerizedLigo) {
    path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = "ligo";
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
      execSync(`${path}  --help`);
    }
  }
  return path;
}

module.exports = async (deployer, network) => {
  if (network === "development") {
    Factory = TestFactory;
    prefix = "Test";
  }

  await deployer.deploy(Factory, factoryStorage, {
    gas: 49000,
    // gasPrice: 1000,
    fee: 1000000,
  });
  let factoryInstance = await Factory.deployed();
  console.log(`Factory address: ${factoryInstance.address}`);

  let ligo = getLigo(true);

  for (dexFunction of dexFunctions) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/${prefix}Factory${standard}.ligo main 'SetDexFunction(record index =${dexFunction.index}n; func = ${dexFunction.name}; end)'`,
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
    await operation.confirmation();
  }
  for (tokenFunction of tokenFunctions[standard]) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/${prefix}Factory${standard}.ligo main 'SetTokenFunction(record index =${tokenFunction.index}n; func = ${tokenFunction.name}; end)'`,
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
    await operation.confirmation();
  }

  if (network !== "development") {
    let token0Instance = await Token.new(tokenStorage);
    let token1Instance = await Token.new(tokenStorage);
    console.log(`Token 1 address: ${token0Instance.address}`);
    console.log(`Token 2 address: ${token1Instance.address}`);
    let tezAmount = 10000;
    let tokenAmount = 1000000;
    await token0Instance.approve(
      factoryInstance.address.toString(),
      tokenAmount
    );
    await token1Instance.approve(
      factoryInstance.address.toString(),
      tokenAmount
    );
    await factoryInstance.launchExchange(
      token0Instance.address.toString(),
      tokenAmount,
      { amount: tezAmount }
    );
    await factoryInstance.launchExchange(
      token1Instance.address.toString(),
      tokenAmount,
      { amount: tezAmount }
    );
  }
};
