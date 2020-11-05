import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { Token } from "./token";
import { TokenStorage } from "./types";
import { prepareProviderOptions } from "./utils";

export class TokenFA12 implements Token {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: TokenStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    this.contract = contract;
  }

  static async init(tokenAddress: string): Promise<TokenFA12> {
    return new TokenFA12(await tezos.contract.at(tokenAddress));
  }

  async updateProvider(accountName: string): Promise<void> {
    let config = await prepareProviderOptions(accountName);
    tezos.setProvider(config);
  }

  async updateStorage(
    maps: {
      ledger?: string[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      total_supply: storage.total_supply,
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

  async transfer(
    from: string,
    to: string,
    amount: number
  ): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .transfer(from, to, amount)
      .send();
    await operation.confirmation();
    return operation;
  }

  async approve(to: string, amount: number): Promise<TransactionOperation> {
    let operation = await this.contract.methods.approve(to, amount).send();
    await operation.confirmation();
    return operation;
  }

  async getBalance(
    owner: string,
    contract: number
  ): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .getBalance(owner, contract)
      .send();
    await operation.confirmation();
    return operation;
  }

  async getAllowance(
    owner: string,
    trusted: string,
    contract: number
  ): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .getAllowance(owner, trusted, contract)
      .send();
    await operation.confirmation();
    return operation;
  }

  async getTotalSupply(contract: number): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .getTotalSupply(null, contract)
      .send();
    await operation.confirmation();
    return operation;
  }
}
