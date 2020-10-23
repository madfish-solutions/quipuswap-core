import {
  Tezos,
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { FactoryStorage } from "./types";
import { execSync } from "child_process";
import { getLigo, prepareProviderOptions, tezPrecision } from "./utils";
const CFactory = artifacts.require("Factory");
const Token = artifacts.require("Token");

export class Factory {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: FactoryStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    this.contract = contract;
  }

  static async init(factoryAddress: string): Promise<Factory> {
    return new Factory(await Tezos.contract.at(factoryAddress));
  }

  async updateProvider(accountName: string): Promise<void> {
    let config = await prepareProviderOptions(accountName);
    Tezos.setProvider(config);
  }

  async updateStorage(
    maps: {
      tokenToExchange?: string[];
      dexLambdas?: number[];
      tokenLambdas?: number[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      tokenList: storage.tokenList,
      tokenToExchange: {},
      dexLambdas: {},
      tokenLambdas: {},
    };
    for (let key in maps) {
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [current]: await storage[key].get(current),
          };
        } catch (ex) {
          return {
            ...(await prev),
          };
        }
      }, Promise.resolve({}));
    }
  }

  async launchExchange(
    tokenAddress: string,
    tokenAmount: number,
    tezAmount: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAddress, tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    await this.updateStorage({ tokenToExchange: [tokenAddress] });
    return operation;
  }

  async setDexFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await Tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0],
      },
    });
    await operation.confirmation();
  }

  async setTokenFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await Tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0],
      },
    });
    await operation.confirmation();
  }

  async approveToken(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    let token = await Tezos.contract.at(tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await operation.confirmation();
  }
}
