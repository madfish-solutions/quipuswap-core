import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenFA12 } from "./tokenFA12";
import { DexStorage } from "./types";
import { tezPrecision } from "./utils";

export class Dex extends TokenFA12 {
  public tezos: TezosToolkit;
  readonly contract: ContractAbstraction<ContractProvider>;
  public storage: DexStorage;

  constructor(
    tezos: TezosToolkit,
    contract: ContractAbstraction<ContractProvider>
  ) {
    super(tezos, contract);
  }

  static async init(tezos: TezosToolkit, dexAddress: string): Promise<Dex> {
    return new Dex(tezos, await tezos.contract.at(dexAddress));
  }

  async updateStorage(
    maps: {
      ledger?: string[];
      voters?: string[];
      vetos?: string[];
      votes?: string[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      tezPool: storage.storage.tezPool,
      tokenPool: storage.storage.tokenPool,
      invariant: storage.storage.invariant,
      tokenAddress: storage.storage.tokenAddress,
      factoryAddress: storage.storage.factoryAddress,
      totalSupply: storage.storage.totalSupply,
      ledger: {},
      voters: {},
      vetos: {},
      votes: {},
      veto: storage.storage.veto,
      currentDelegated: storage.storage.currentDelegated,
      currentCandidate: storage.storage.currentCandidate,
      totalVotes: storage.storage.totalVotes,
      rewardInfo: storage.storage.rewardInfo,
      userRewards: {},
    };
    for (let key in maps) {
      this.storage[key] = await maps[key].reduce(async (prev, current) => {
        try {
          return {
            ...(await prev),
            [current]: await storage.storage[key].get(current),
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

  async initializeExchange(
    tokenAmount: number,
    tezAmount: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(0, "initializeExchange", tokenAmount)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenPayment(
    minTokens: number,
    tezAmount: number,
    receiver: string
  ): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use(1, "tezToTokenPayment", minTokens, receiver)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    return operation;
  }

  async tezToTokenSwap(
    minTokens: number,
    tezAmount: number
  ): Promise<TransactionOperation> {
    return await this.tezToTokenPayment(
      minTokens,
      tezAmount,
      await this.tezos.signer.publicKeyHash()
    );
  }

  async tokenToTezPayment(
    tokenAmount: number,
    minTezOut: number,
    receiver: string
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(2, "tokenToTezPayment", tokenAmount, minTezOut, receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTezSwap(
    tokenAmount: number,
    minTezOut: number
  ): Promise<TransactionOperation> {
    return await this.tokenToTezPayment(
      tokenAmount,
      minTezOut,
      await this.tezos.signer.publicKeyHash()
    );
  }

  async tokenToTokenPayment(
    tokenAmount: number,
    minTokensOut: number,
    secondDexContract: ContractAbstraction<ContractProvider>,
    middleTezAmount: number,
    receiver: string
  ): Promise<BatchOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const minTez = Math.floor(middleTezAmount * 0.9);
    const batch = this.tezos
      .batch([])
      .withTransfer(
        this.contract.methods
          .use(
            2,
            "tokenToTezPayment",
            tokenAmount,
            minTez ? minTez : 1,
            await this.tezos.signer.publicKeyHash()
          )
          .toTransferParams()
      )
      .withTransfer(
        secondDexContract.methods
          .use(1, "tezToTokenPayment", minTokensOut, receiver)
          .toTransferParams({ amount: middleTezAmount / tezPrecision })
      );
    const operation = await batch.send();
    await operation.confirmation();
    return operation;
  }

  async tokenToTokenSwap(
    tokenAmount: number,
    minTokensOut: number,
    secondDexContract: ContractAbstraction<ContractProvider>,
    middleTezAmount: number
  ): Promise<BatchOperation> {
    return await this.tokenToTokenPayment(
      tokenAmount,
      minTokensOut,
      secondDexContract,
      middleTezAmount,
      await this.tezos.signer.publicKeyHash()
    );
  }

  async investLiquidity(
    tokenAmount: number,
    tezAmount: number,
    minShares: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(4, "investLiquidity", minShares)
      .send({ amount: tezAmount / tezPrecision });
    await operation.confirmation();
    return operation;
  }

  async divestLiquidity(
    tokenAmount: number,
    tezAmount: number,
    sharesBurned: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use(5, "divestLiquidity", tezAmount, tokenAmount, sharesBurned)
      .send();
    await operation.confirmation();
    return operation;
  }

  async vote(
    voter: string,
    delegate: string,
    value: number
  ): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use(6, "vote", delegate, value, voter)
      .send();
    await operation.confirmation();
    return operation;
  }

  async veto(voter: string, value: number): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use(7, "veto", value, voter)
      .send();
    await operation.confirmation();
    return operation;
  }

  async withdrawProfit(receiver: number): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use(3, "withdrawProfit", receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async sendReward(amount: number): Promise<TransactionOperation> {
    const operation = await this.tezos.contract.transfer({
      to: this.contract.address,
      amount: amount / tezPrecision,
    });
    await operation.confirmation();
    return operation;
  }

  async approveToken(tokenAmount: number, address: string): Promise<void> {
    await this.updateStorage();
    let token = await this.tezos.contract.at(this.storage.tokenAddress);
    let operation = await token.methods.approve(address, tokenAmount).send();
    await operation.confirmation();
  }
}
