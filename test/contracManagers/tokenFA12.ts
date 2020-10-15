import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenStorage } from "./types";

export class TokenFA12 {
  public tezos: TezosToolkit;
  readonly contract: ContractAbstraction<ContractProvider>;
  public storage: TokenStorage;

  constructor(
    tezos: TezosToolkit,
    contract: ContractAbstraction<ContractProvider>
  ) {
    this.tezos = tezos;
    this.contract = contract;
  }

  static async init(
    tezos: TezosToolkit,
    dexAddress: string
  ): Promise<TokenFA12> {
    return new TokenFA12(tezos, await tezos.contract.at(dexAddress));
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
