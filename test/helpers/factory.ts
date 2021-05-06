import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { FactoryStorage } from "./types";
import { execSync } from "child_process";
import { getLigo, prepareProviderOptions, tezPrecision } from "./utils";
import { defaultTokenId } from "./tokenFA2";
import { confirmOperation } from "./confirmation";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;
export class Factory {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: FactoryStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    this.contract = contract;
  }

  static async init(factoryAddress: string): Promise<Factory> {
    return new Factory(await tezos.contract.at(factoryAddress));
  }

  async updateProvider(accountName: string): Promise<void> {
    let config = await prepareProviderOptions(accountName);
    tezos.setProvider(config);
  }

  wrapStorageArgument(map: string, key: any): any {
    if (map === "token_to_exchange" && standard === "FA2") {
      return [key, defaultTokenId];
    }
    return key;
  }

  async convertTokensList(bigMap: any, counter: number): Promise<any> {
    let list = [];
    for (let i = 0; i < counter; i++) {
      list.push(await bigMap.get(i.toString()));
    }
    if (standard === "FA2") {
      return list.map((value) => {
        return value["0"];
      });
    }
    return list;
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
      baker_validator: storage.baker_validator,
      token_list: await this.convertTokensList(
        storage.token_list,
        storage.counter
      ),
      token_to_exchange: {},
      dex_lambdas: {},
      token_lambdas: {},
    };
    for (let key in maps) {
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [current]: await storage[key].get(
              this.wrapStorageArgument(key, current)
            ),
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
    tezAmount: number,
    approve: boolean = true
  ): Promise<TransactionOperation> {
    return standard === "FA2"
      ? await this.launchExchangeFA2(
          tokenAddress,
          tokenAmount,
          tezAmount,
          approve
        )
      : await this.launchExchangeFA12(
          tokenAddress,
          tokenAmount,
          tezAmount,
          approve
        );
  }

  async launchExchangeFA2(
    tokenAddress: string,
    tokenAmount: number,
    tezAmount: number,
    approve: boolean = true
  ): Promise<TransactionOperation> {
    if (approve)
      await this.approveToken(tokenAddress, tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, defaultTokenId, tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await confirmOperation(tezos, operation.hash);
    await this.updateStorage({ token_to_exchange: [tokenAddress] });
    return operation;
  }

  async launchExchangeFA12(
    tokenAddress: string,
    tokenAmount: number,
    tezAmount: number,
    approve: boolean = true
  ): Promise<TransactionOperation> {
    if (approve)
      await this.approveToken(tokenAddress, tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .launchExchange(tokenAddress, tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await confirmOperation(tezos, operation.hash);
    await this.updateStorage({ token_to_exchange: [tokenAddress] });
    return operation;
  }

  async setDexFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TestFactory${standard}.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  async setTokenFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TestFactory${standard}.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  async approveToken(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    return standard === "FA2"
      ? await this.approveTokenFA2(tokenAddress, tokenAmount, address)
      : await this.approveTokenFA12(tokenAddress, tokenAmount, address);
  }

  async approveTokenFA2(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .update_operators([
        {
          [tokenAmount ? "add_operator" : "remove_operator"]: {
            owner: await tezos.signer.publicKeyHash(),
            operator: address,
            token_id: defaultTokenId,
          },
        },
      ])
      .send();
    await confirmOperation(tezos, operation.hash);
  }

  async approveTokenFA12(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<void> {
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await confirmOperation(tezos, operation.hash);
  }
}
