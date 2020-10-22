import {
  Tezos,
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenStorage } from "./types";
import { prepareProviderOptions } from "./utils";
const Token = artifacts.require("Token");

export class TokenFA12 {
  public contract: any;
  public storage: TokenStorage;

  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(tokenAddress: string): Promise<TokenFA12> {
    return new TokenFA12(await Token.at(tokenAddress));
  }

  async updateProvider(keyPath: string): Promise<void> {
    let config = await prepareProviderOptions(keyPath);
    Tezos.setProvider(config);
  }

  async updateStorage(
    maps: {
      ledger?: string[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      totalSupply: storage.totalSupply,
      ledger: {},
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
            [current]: 0,
          };
        }
      }, Promise.resolve({}));
    }
  }

  async transfer(from: string, to: string, amount: number): Promise<void> {
    await this.contract.transfer(from, to, amount);
  }

  async approve(to: string, amount: number): Promise<void> {
    await this.contract.methods.approve(to, amount);
  }

  async getBalance(owner: string, contract: number): Promise<void> {
    await this.contract.methods.getBalance(owner, contract);
  }

  async getAllowance(
    owner: string,
    trusted: string,
    contract: number
  ): Promise<void> {
    await this.contract.methods.getAllowance(owner, trusted, contract);
  }

  async getTotalSupply(contract: number): Promise<void> {
    await this.contract.methods.getTotalSupply(null, contract);
  }
}
