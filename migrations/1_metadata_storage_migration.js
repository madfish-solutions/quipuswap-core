const standard = process.env.EXCHANGE_TOKEN_STANDARD;
let prefix = "";
const MetadataStorage = artifacts.require("MetadataStorage");
const metadataStorage = require("../storage/MetadataStorage");
const fs = require("fs");

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(MetadataStorage, metadataStorage);
  let metadataStorageInstance = await MetadataStorage.deployed();

  if (network === "development") {
    prefix = "Test";
  }
  const fileName = `./build/contracts/${prefix}Factory${standard}.json`;
  let rawdata = fs.readFileSync(fileName);
  let factory = JSON.parse(rawdata);
  factory.michelson = factory.michelson.replace(
    "7b7d",
    Buffer(
      metadataStorageInstance.address.toString() + "/metadata",
      "ascii"
    ).toString("hex")
  );
  let data = JSON.stringify(factory);
  fs.writeFileSync(fileName, data);
  console.log(`MetadataStorage address: ${metadataStorageInstance.address}`);
};
