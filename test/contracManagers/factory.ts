import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { FactoryStorage } from "./types";
import { execSync } from "child_process";
import { getLigo, tezPrecision } from "./utils";

export class Factory {
  public tezos: TezosToolkit;
  readonly contract: ContractAbstraction<ContractProvider>;
  public storage: FactoryStorage;

  constructor(
    tezos: TezosToolkit,
    contract: ContractAbstraction<ContractProvider>
  ) {
    this.tezos = tezos;
    this.contract = contract;
  }

  static async init(tezos: TezosToolkit, dexAddress: string): Promise<Factory> {
    return new Factory(tezos, await tezos.contract.at(dexAddress));
  }

  async updateStorage(
    maps: {
      tokenToExchange?: string[];
      dexLambdas?: string[];
      tokenLambdas?: string[];
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
          console.error(ex);
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

  async setDexFunction(
    index: number,
    lambdaName: string
  ): Promise<TransactionOperation> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/Factory.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await this.tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0],
      },
    });
    await operation.confirmation();
    return operation;
  }

  async setTokenFunction(
    index: number,
    lambdaName: string
  ): Promise<TransactionOperation> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/Factory.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await this.tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0],
      },
    });
    await operation.confirmation();
    return operation;
  }

  async approveToken(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    let token = await this.tezos.contract.at(tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await operation.confirmation();
  }
}
