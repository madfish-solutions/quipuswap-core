const { TezosToolkit } = require("@taquito/taquito");
const fs = require("fs");
const { InMemorySigner } = require("@taquito/signer");
const path = require("path");
const { execSync } = require("child_process");

const { network: provider } = JSON.parse(
  fs.readFileSync("./deploy/Factory.json").toString()
);

exports.getLigo = (isDockerizedLigo) => {
  let path = "ligo";
  if (isDockerizedLigo) {
    path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use global version...");
      path = "ligo";
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use Dockerized version...");
      path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
      execSync(`${path}  --help`);
    }
  }
  return path;
};

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

exports.setup = async (keyPath = "../fixtures/key") => {
  keyPath = path.join(__dirname, keyPath);
  const secretKey = fs.readFileSync(keyPath).toString().trim();
  let tezos = new TezosToolkit();
  await tezos.setProvider({
    rpc: provider,
    signer: await new InMemorySigner.fromSecretKey(secretKey),
    config: {
      confirmationPollingTimeoutSecond: 1000,
    },
  });
  return tezos;
};
