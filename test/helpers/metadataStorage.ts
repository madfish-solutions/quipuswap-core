import {
  ContractAbstraction,
  ContractProvider,
  MichelsonMap,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { MetadataStorage } from "./types";
import { prepareProviderOptions } from "./utils";

export class Metadata {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: MetadataStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    this.contract = contract;
  }

  static async init(metadataAddress: string): Promise<Metadata> {
    return new Metadata(await tezos.contract.at(metadataAddress));
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
      metadata: {},
      owners: storage.owners,
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

  async updateOwners(
    add: boolean,
    owner: string
  ): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .update_owners(add, owner)
      .send();
    await operation.confirmation();
    return operation;
  }

  async updateMetadata(
    metadata: MichelsonMap<any, any>
  ): Promise<TransactionOperation> {
    let operation = await this.contract.methods.update_storage(metadata).send();
    await operation.confirmation();
    return operation;
  }
  async getMetadata(contract: number): Promise<TransactionOperation> {
    let operation = await this.contract.methods
      .get_metadata(null, contract)
      .send();
    await operation.confirmation();
    return operation;
  }
}
