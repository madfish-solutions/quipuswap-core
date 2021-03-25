const MetadataStorage = artifacts.require("MetadataStorage");
const metadataStorage = require("../storage/MetadataStorage");

module.exports = async (deployer) => {
  await deployer.deploy(MetadataStorage, metadataStorage);
  const metadataStorageInstance = await MetadataStorage.deployed();
  console.log(`MetadataStorage address: ${metadataStorageInstance.address}`);
};
