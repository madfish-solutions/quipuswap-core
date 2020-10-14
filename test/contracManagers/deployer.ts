import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import fs = require("fs");
import path = require("path");
import { execSync } from "child_process";

export class Deployer {
  public tezos: TezosToolkit;

  constructor(tezos: TezosToolkit) {
    this.tezos = tezos;
  }

  async deploy(
    contractName: string,
    withInit: boolean,
    balance: string
  ): Promise<string> {
    let operation;
    let inputDir = process.env.npm_package_config_inputdir;
    let storageDir = process.env.npm_package_config_storagedir;
    if (withInit) {
      operation = await this.tezos.contract.originate({
        code: JSON.parse(
          fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()
        ),
        init: JSON.parse(
          fs.readFileSync(`./${storageDir}/${contractName}.json`).toString()
        ),
        balance: balance,
      });
    } else {
      operation = await this.tezos.contract.originate({
        code: JSON.parse(
          fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()
        ),
        storage: require(`../${storageDir}/${contractName}.js`),
        balance: balance,
      });
    }
    let contract = await operation.contract();
    return contract.address;
  }
}
