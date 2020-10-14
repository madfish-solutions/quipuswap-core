import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import fs = require("fs");
import path = require("path");
import { execSync } from "child_process";
import { InMemorySigner } from "@taquito/signer";

const provider = process.env.npm_package_config_network;

export function getLigo(isDockerizedLigo: boolean): string {
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
}

export async function setup(
  keyPath: string = "../fixtures/key"
): Promise<TezosToolkit> {
  keyPath = path.join(__dirname, keyPath);
  const secretKey = fs.readFileSync(keyPath).toString().trim();
  let tezos = new TezosToolkit();
  await tezos.setProvider({
    rpc: provider,
    signer: await InMemorySigner.fromSecretKey(secretKey),
    config: {
      confirmationPollingTimeoutSecond: 10000,
    },
  });
  return tezos;
}
