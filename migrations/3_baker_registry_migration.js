const BakerRegistry = artifacts.require("BakerRegistry");
const { MichelsonMap } = require("@taquito/michelson-encoder");

module.exports = async (deployer) => {
  const standard = process.env.EXCHANGE_TOKEN_STANDARD;
  if (!["FA2", "FA12"].includes(standard)) return;
  await deployer.deploy(BakerRegistry, MichelsonMap.fromLiteral({}));
  const bakerRegistryInstance = await BakerRegistry.deployed();
  console.log(`BakerRegistry address: ${bakerRegistryInstance.address}`);
};
