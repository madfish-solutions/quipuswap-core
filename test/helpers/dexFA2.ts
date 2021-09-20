import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { BigNumber } from "bignumber.js";
import { TokenFA2 } from "./tokenFA2";
import { DexStorage, SwapSliceType } from "./types";
import { getLigo } from "./utils";
import { execSync } from "child_process";
import { confirmOperation } from "./confirmation";

const standard = process.env.EXCHANGE_TOKEN_STANDARD;

export class Dex extends TokenFA2 {
  public contract: ContractAbstraction<ContractProvider>;
  public storage: DexStorage;

  constructor(contract: ContractAbstraction<ContractProvider>) {
    super(contract);
  }

  static async init(dexAddress: string): Promise<Dex> {
    return new Dex(await tezos.contract.at(dexAddress));
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
      if (["dex_lambdas", "token_lambdas", "bal_lambdas"].includes(key))
        continue;
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [key == "ledger" ? current[0] : current]: await storage.storage[
              key
            ].get(current),
          };
        } catch (ex) {
          console.log(ex);
          return {
            ...(await prev),
          };
        }
      }, Promise.resolve({}));
    }
    for (let key in maps) {
      if (!["dex_lambdas", "token_lambdas", "bal_lambdas"].includes(key))
        continue;
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
    tokenAid: BigNumber = new BigNumber(0),
    tokenBid: BigNumber = new BigNumber(0),
    approve: boolean = true
  ): Promise<TransactionOperation> {
    var operation;
    switch (standard.toLocaleLowerCase()) {
      case "fa12":
        await this.approveFA12Token(
          tokenAAddress,
          tokenAAmount,
          this.contract.address
        );
        await this.approveFA12Token(
          tokenBAddress,
          tokenBAmount,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "addPair",
            "fa12",
            tokenAAddress,
            "fa12",
            tokenBAddress,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
      case "fa2":
        await this.approveFA2Token(
          tokenAAddress,
          tokenAid,
          tokenAAmount || 1,
          this.contract.address
        );
        await this.approveFA2Token(
          tokenBAddress,
          tokenBid,
          tokenBAmount || 1,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "addPair",
            "fa2",
            tokenAAddress,
            tokenAid,
            "fa2",
            tokenBAddress,
            tokenBid,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
      case "mixed":
        await this.approveFA12Token(
          tokenAAddress,
          tokenAAmount,
          this.contract.address
        );
        await this.approveFA2Token(
          tokenBAddress,
          tokenBid,
          tokenBAmount,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "addPair",
            "fa12",
            tokenAAddress,
            "fa2",
            tokenBAddress,
            tokenBid,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
    }
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async tokenToTokenRoutePayment(
    swaps: SwapSliceType[],
    amountIn: number,
    minAmountOut: number,
    receiver: string
  ): Promise<TransactionOperation> {
    let firstSwap = swaps[0];
    if (Object.keys(firstSwap.operation)[0] == "buy") {
      switch (standard.toLocaleLowerCase()) {
        case "fa12":
          await this.approveFA12Token(
            firstSwap.pair.token_b_type.fa12,
            amountIn,
            this.contract.address
          );
          break;
        case "fa2":
          await this.approveFA2Token(
            firstSwap.pair.token_b_type.fa2.token_address,
            firstSwap.pair.token_b_type.fa2.token_id,
            amountIn,
            this.contract.address
          );
          break;
        case "mixed":
          await this.approveFA2Token(
            firstSwap.pair.token_b_type.fa2.token_address,
            firstSwap.pair.token_b_type.fa2.token_id,
            amountIn,
            this.contract.address
          );
          break;
      }
    } else {
      switch (standard.toLocaleLowerCase()) {
        case "fa12":
          await this.approveFA12Token(
            firstSwap.pair.token_a_type.fa12,
            amountIn,
            this.contract.address
          );
          break;
        case "fa2":
          await this.approveFA2Token(
            firstSwap.pair.token_a_type.fa2.token_address,
            firstSwap.pair.token_a_type.fa2.token_id,
            amountIn,
            this.contract.address
          );
          break;
        case "mixed":
          await this.approveFA12Token(
            firstSwap.pair.token_a_type.fa12,
            amountIn,
            this.contract.address
          );
          break;
      }
    }
    const operation = await this.contract.methods
      .use("swap", swaps, amountIn, minAmountOut, receiver)
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
    receiver: string,
    tokenAid: BigNumber = new BigNumber(0),
    tokenBid: BigNumber = new BigNumber(0)
  ): Promise<TransactionOperation> {
    if (opType == "buy") {
      if (["FA2"].includes(standard)) {
        await this.approveFA2Token(
          tokenBAddress,
          tokenBid,
          amountIn,
          this.contract.address
        );
      } else {
        await this.approveFA12Token(
          tokenBAddress,
          amountIn,
          this.contract.address
        );
      }
    } else {
      if (["FA2", "MIXED"].includes(standard)) {
        await this.approveFA2Token(
          tokenAAddress,
          tokenAid,
          amountIn,
          this.contract.address
        );
      } else {
        await this.approveFA12Token(
          tokenAAddress,
          amountIn,
          this.contract.address
        );
      }
    }
    const swaps = [
      {
        pair: {
          token_a_address: tokenAAddress,
          token_b_address: tokenBAddress,
          token_a_id: tokenAid,
          token_b_id: tokenBid,
          token_a_type: {
            [standard.toLowerCase() == "mixed"
              ? "fa2"
              : standard.toLowerCase()]: null,
          },
          token_b_type: {
            [standard.toLowerCase() == "mixed"
              ? "fa12"
              : standard.toLowerCase()]: null,
          },
        },
        operation: { [opType]: null },
      },
    ];
    const operation = await this.contract.methods
      .use("swap", swaps, amountIn, minAmountOut, receiver)
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
    let operation;
    switch (standard.toLocaleLowerCase()) {
      case "fa12":
        await this.approveFA12Token(
          pair.token_a_type.fa12,
          tokenAAmount,
          this.contract.address
        );
        await this.approveFA12Token(
          pair.token_b_type.fa12,
          tokenBAmount,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "invest",
            "fa12",
            pair.token_a_type.fa12,
            "fa12",
            pair.token_b_type.fa12,
            minShares,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
      case "fa2":
        await this.approveFA2Token(
          pair.token_a_type.fa2.token_address,
          pair.token_a_type.fa2.token_id,
          tokenAAmount,
          this.contract.address
        );
        await this.approveFA2Token(
          pair.token_b_type.fa2.token_address,
          pair.token_b_type.fa2.token_id,
          tokenBAmount,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "invest",
            "fa2",
            pair.token_a_type.fa2.token_address,
            pair.token_a_type.fa2.token_id,
            "fa2",
            pair.token_b_type.fa2.token_address,
            pair.token_b_type.fa2.token_id,
            minShares,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
      case "mixed":
        await this.approveFA12Token(
          pair.token_a_type.fa12,
          tokenAAmount,
          this.contract.address
        );
        await this.approveFA2Token(
          pair.token_b_type.fa2.token_address,
          pair.token_b_type.fa2.token_id,
          tokenBAmount,
          this.contract.address
        );
        operation = await this.contract.methods
          .use(
            "invest",
            "fa12",
            pair.token_a_type.fa12,
            "fa2",
            pair.token_b_type.fa2.token_address,
            pair.token_b_type.fa2.token_id,
            minShares,
            tokenAAmount,
            tokenBAmount
          )
          .send();
        break;
    }
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
    console.log(pair);
    let operation;
    switch (standard.toLocaleLowerCase()) {
      case "fa12":
        operation = await this.contract.methods
          .use(
            "divest",
            "fa12",
            pair.token_a_type.fa12,
            "fa12",
            pair.token_b_type.fa12,
            tokenAAmount,
            tokenBAmount,
            sharesBurned
          )
          .send();
        break;
      case "fa2":
        operation = await this.contract.methods
          .use(
            "divest",
            "fa2",
            pair.token_a_type.fa2.token_address,
            pair.token_a_type.fa2.token_id,
            "fa2",
            pair.token_b_type.fa2.token_address,
            pair.token_b_type.fa2.token_id,
            tokenAAmount,
            tokenBAmount,
            sharesBurned
          )
          .send();
        break;
      case "mixed":
        operation = await this.contract.methods
          .use(
            "divest",
            "fa12",
            pair.token_a_type.fa12,
            "fa2",
            pair.token_b_type.fa2.token_address,
            pair.token_b_type.fa2.token_id,
            tokenAAmount,
            tokenBAmount,
            sharesBurned
          )
          .send();
        break;
    }
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async approveFA2Token(
    tokenAddress: string,
    tokenId: BigNumber,
    tokenAmount: number,
    address: string
  ): Promise<TransactionOperation> {
    await this.updateStorage();
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .update_operators([
        {
          [tokenAmount ? "add_operator" : "remove_operator"]: {
            owner: await tezos.signer.publicKeyHash(),
            operator: address,
            token_id: tokenId,
          },
        },
      ])
      .send();
    await confirmOperation(tezos, operation.hash);
    return operation;
  }

  async approveFA12Token(
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
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Dex.ligo main 'SetDexFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setDexFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  async setTokenFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Dex.ligo main 'SetTokenFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setTokenFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }

  async setBalFunction(index: number, lambdaName: string): Promise<void> {
    let ligo = getLigo(true);
    const stdout = execSync(
      `${ligo} compile-parameter --michelson-format=json $PWD/contracts/main/Dex.ligo main 'SetBalanceFunction(record index =${index}n; func = ${lambdaName}; end)'`,
      { maxBuffer: 1024 * 500 }
    );
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: 0,
      parameter: {
        entrypoint: "setBalanceFunction",
        value: JSON.parse(stdout.toString()).args[0].args[0].args[0].args[0],
      },
    });
    await confirmOperation(tezos, operation.hash);
  }
}
