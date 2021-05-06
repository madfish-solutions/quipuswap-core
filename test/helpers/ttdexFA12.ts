import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { BigNumber } from "bignumber.js";
import { TokenFA2 } from "./tokenFA2";
import { TTDexStorage } from "./types";
import { getLigo } from "./utils";
import { execSync } from "child_process";
import { confirmOperation } from "./confirmation";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

export class TTDex extends TokenFA2 {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: TTDexStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    super(contract);
  }

  static async init(dexAddress: string): Promise<TTDex> {
    return new TTDex(await tezos.contract.at(dexAddress));
  }

  async updateStorage(
    maps: {
      tokens?: string[];
      token_to_id?: string[];
      pairs?: string[];
      ledger?: any[];
      dex_lambdas?: number[];
      token_lambdas?: number[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      pairs_count: storage.storage.pairs_count,
      tokens: {},
      token_to_id: {},
      pairs: {},
      ledger: {},
      dex_lambdas: {},
      token_lambdas: {},
    };
    for (let key in maps) {
      if (["dex_lambdas", "token_lambdas"].includes(key)) continue;
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [key == "ledger" ? current[0] : current]: await storage.storage[
              key
            ].get(current),
          };
        } catch (ex) {
          return {
            ...(await prev),
          };
        }
      }, Promise.resolve({}));
    }
    for (let key in maps) {
      if (!["dex_lambdas", "token_lambdas"].includes(key)) continue;
      this[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [current]: await storage[key].get(current.toString()),
          };
        } catch (ex) {
          return {
            ...(await prev),
          };
        }
      }, Promise.resolve({}));
    }
  }

  async initializeExchange(
    tokenAAddress: string,
    tokenBAddress: string,
    tokenAAmount: number,
    tokenBAmount: number,
    approve: boolean = true
  ): Promise<TransactionOperation> {
    if (approve) {
      await this.approveToken(
        tokenAAddress,
        tokenAAmount,
        this.contract.address
      );
      await this.approveToken(
        tokenBAddress,
        tokenBAmount,
        this.contract.address
      );
    }
    const operation = await this.contract.methods
      .use(
        "initializeExchange",
        tokenAAddress,
        tokenBAddress,
        tokenAAmount,
        tokenBAmount
      )
      .send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async tokenToTokenPayment(
    tokenAAddress: string,
    tokenBAddress: string,
    opType: string,
    amountIn: number,
    minAmountOut: number,
    receiver: string
  ): Promise<TransactionOperation> {
    if (opType == "buy") {
      await this.approveToken(tokenBAddress, amountIn, this.contract.address);
    } else {
      await this.approveToken(tokenAAddress, amountIn, this.contract.address);
    }
    const operation = await this.contract.methods
      .use(
        "tokenToTokenPayment",
        tokenAAddress,
        tokenBAddress,
        opType,
        null,
        amountIn,
        minAmountOut,
        receiver
      )
      .send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async investLiquidity(
    pairId: string,
    tokenAAmount: number,
    tokenBAmount: number,
    minShares: number
  ): Promise<TransactionOperation> {
    await this.updateStorage({ tokens: [pairId] });
    let pair = this.storage.tokens[pairId];
    await this.approveToken(
      pair.token_a_address,
      tokenAAmount,
      this.contract.address
    );
    await this.approveToken(
      pair.token_b_address,
      tokenBAmount,
      this.contract.address
    );
    const operation = await this.contract.methods
      .use(
        "investLiquidity",
        pair.token_a_address,
        pair.token_b_address,
        tokenAAmount,
        tokenBAmount,
        minShares
      )
      .send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async divestLiquidity(
    pairId: string,
    tokenAAmount: number,
    tokenBAmount: number,
    sharesBurned: number
  ): Promise<TransactionOperation> {
    await this.updateStorage({ tokens: [pairId] });
    let pair = this.storage.tokens[pairId];
    const operation = await this.contract.methods
      .use(
        "divestLiquidity",
        pair.token_a_address,
        pair.token_b_address,
        tokenAAmount,
        tokenBAmount,
        sharesBurned
      )
      .send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async approveToken(
    tokenAddress: string,
    tokenAmount: number,
    address: string
  ): Promise<TransactionOperation> {
    await this.updateStorage();
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async setDexFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TTDex${standard}.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  async setTokenFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/TTDex${standard}.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }
}
