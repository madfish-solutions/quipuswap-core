const Factory = artifacts.require("Factory");
const Token = artifacts.require("Token");

module.exports = async deployer => {
  const tokenStorage = require("../storage/Token")
  const factoryStorage = require("../storage/Factory")
  let factoryInstance = await Factory.new(factoryStorage);
  let token0Instance = await Token.new(tokenStorage);
  let token1Instance = await Token.new(tokenStorage);
  console.log(`Factory address: ${factoryInstance.address}`)
  console.log(`Token 1 address: ${token0Instance.address}`)
  console.log(`Token 1 address: ${token1Instance.address}`)
};
