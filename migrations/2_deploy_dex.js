const Factory = artifacts.require("Factory");
const Token = artifacts.require("Token");
const tokenStorage = require("../storage/Token")
const factoryStorage = require("../storage/Factory")
const {dexFunctions, tokenFunctions} = require("../storage/Functions")
const { execSync } = require( "child_process");

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

module.exports = async deployer => {
  let factoryInstance = await Factory.new(factoryStorage);
  let token0Instance = await Token.new(tokenStorage);
  let token1Instance = await Token.new(tokenStorage);

  console.log(`Factory address: ${factoryInstance.address}`)
  console.log(`Token 1 address: ${token0Instance.address}`)
  console.log(`Token 2 address: ${token1Instance.address}`)

  let ligo = getLigo(true);
  console.log("Setting dex functions")
  for (dexFunction of dexFunctions) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory.ligo main 'SetDexFunction(record index =${dexFunction.index}n; func = ${dexFunction.name}; end)'`,
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
    console.log(`${dexFunction.name} function set`)
  }

  console.log("Setting token functions")
  for (tokenFunction of tokenFunctions) {
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory.ligo main 'SetTokenFunction(record index =${tokenFunction.index}n; func = ${tokenFunction.name}; end)'`,
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
    console.log(`${tokenFunction.name} function set`)

    let tezAmount = 10000;
    let tokenAmount = 1000000;
  
    console.log("Approve tokens")
    await token0Instance.approve(factoryInstance.address.toString(), tokenAmount)
    await token1Instance.approve(factoryInstance.address.toString(), tokenAmount)  

    console.log("Launch exchanges")
    await factoryInstance.launchExchange(token0Instance.address, tezAmount, tokenAmount);
    await factoryInstance.launchExchange(token1Instance.address, tezAmount, tokenAmount);
  }
};
