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
import { defaultTokenId } from "./tokenFA2";
const standard = process.env.npm_package_config_standard;

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
      token_to_exchange?: string[];
      dex_lambdas?: number[];
      token_lambdas?: number[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      token_list: storage.token_list,
      token_to_exchange: {},
      dex_lambdas: {},
      token_lambdas: {},
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
    return standard === "FA2"
      ? await this.launchExchangeFA2(tokenAddress, tokenAmount, tezAmount)
      : await this.launchExchangeFA12(tokenAddress, tokenAmount, tezAmount);
  }

  async launchExchangeFA2(
    tokenAddress: string,
    tokenAmount: number,
    tezAmount: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAddress, tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, defaultTokenId, tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    await this.updateStorage({ token_to_exchange: [tokenAddress] });
    return operation;
  }

  async launchExchangeFA12(
    tokenAddress: string,
    tokenAmount: number,
    tezAmount: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAddress, tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    await this.updateStorage({ token_to_exchange: [tokenAddress] });
    return operation;
  }

  async setDexFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory${standard}.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
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
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Factory${standard}.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
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
    return standard === "FA2"
      ? await this.approveTokenFA2(tokenAddress, address)
      : await this.approveTokenFA12(tokenAddress, tokenAmount, address);
  }

  async approveTokenFA2(tokenAddress: string, address: string): Promise<void> {
    let token = await Tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .update_operators([
        [
          "Add_operator",
          {
            owner: await Tezos.signer.publicKeyHash(),
            operator: address,
            token_id: defaultTokenId,
          },
        ],
      ])
      .send();
    await operation.confirmation();
  }

  async approveTokenFA12(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    let token = await Tezos.contract.at(tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await operation.confirmation();
  }
}
