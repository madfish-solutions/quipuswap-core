const BakerRegistry = artifacts.require("BakerRegistry");
const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = async (deployer) => {
  await deployer.deploy(BakerRegistry, MichelsonMap.fromLiteral({}));
  const bakerRegistryInstance = await BakerRegistry.deployed();
  console.log(`BakerRegistry address: ${bakerRegistryInstance.address}`);
};
