import {
  Tezos,
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenFA12 } from "./tokenFA12";
import { DexStorage } from "./types";
import { tezPrecision } from "./utils";
const CDex = artifacts.require("Dex");
const Token = artifacts.require("Token");

export class Dex extends TokenFA12 {
  public contract: any;
  public storage: DexStorage;

  constructor(contract: any) {
    super(contract);
  }

  static async init(dexAddress: string): Promise<Dex> {
    return new Dex(await CDex.at(dexAddress));
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
  ): Promise<void> {
    await this.approveToken(tokenAmount, this.contract.address);
    await this.contract.use(0, "initializeExchange", tokenAmount, {
      amount: tezAmount / tezPrecision,
    });
  }

  async tezToTokenPayment(
    minTokens: number,
    tezAmount: number,
    receiver: string
  ): Promise<void> {
    await this.contract.use(1, "tezToTokenPayment", minTokens, receiver, {
      amount: tezAmount / tezPrecision,
    });
  }

  async tezToTokenSwap(minTokens: number, tezAmount: number): Promise<void> {
    return await this.tezToTokenPayment(
      minTokens,
      tezAmount,
      await Tezos.signer.publicKeyHash()
    );
  }

  async tokenToTezPayment(
    tokenAmount: number,
    minTezOut: number,
    receiver: string
  ): Promise<TransactionOperation[]> {
    const tokensOperation = await this.approveToken(
      tokenAmount,
      this.contract.address
    );
    const operation = await this.contract.use(
      2,
      "tokenToTezPayment",
      tokenAmount,
      minTezOut,
      receiver
    );
    await operation.confirmation();
    return [tokensOperation, operation];
  }

  async tokenToTezSwap(
    tokenAmount: number,
    minTezOut: number
  ): Promise<TransactionOperation[]> {
    return await this.tokenToTezPayment(
      tokenAmount,
      minTezOut,
      await Tezos.signer.publicKeyHash()
    );
  }

  async tokenToTokenPayment(
    tokenAmount: number,
    minTokensOut: number,
    secondDexContract: ContractAbstraction<ContractProvider>,
    middleTezAmount: number,
    receiver: string
  ): Promise<BatchOperation[]> {
    await this.updateStorage();
    let token = await Tezos.contract.at(this.storage.tokenAddress);
    const batch = Tezos.batch([])
      .withTransfer(
        token.methods
          .approve(this.contract.address, tokenAmount)
          .toTransferParams()
      )
      .withTransfer(
        this.contract.methods
          .use(
            2,
            "tokenToTezPayment",
            tokenAmount,
            middleTezAmount ? middleTezAmount : 1,
            await Tezos.signer.publicKeyHash()
          )
          .toTransferParams()
      )
      .withTransfer(
        secondDexContract.methods
          .use(1, "tezToTokenPayment", minTokensOut, receiver)
          .toTransferParams({ amount: middleTezAmount / tezPrecision })
      );
    const operation = await batch.send();
    return [operation];
  }

  async tokenToTokenSwap(
    tokenAmount: number,
    minTokensOut: number,
    secondDexContract: ContractAbstraction<ContractProvider>,
    middleTezAmount: number
  ): Promise<BatchOperation[]> {
    return await this.tokenToTokenPayment(
      tokenAmount,
      minTokensOut,
      secondDexContract,
      middleTezAmount,
      await Tezos.signer.publicKeyHash()
    );
  }

  async investLiquidity(
    tokenAmount: number,
    tezAmount: number,
    minShares: number
  ): Promise<void> {
    await this.approveToken(tokenAmount, this.contract.address);
    await this.contract.methods
      .use(4, "investLiquidity", minShares)
      .send({ amount: tezAmount / tezPrecision });
  }

  async divestLiquidity(
    tokenAmount: number,
    tezAmount: number,
    sharesBurned: number
  ): Promise<void> {
    await this.approveToken(tokenAmount, this.contract.address);
    await this.contract.methods.use(
      5,
      "divestLiquidity",
      tezAmount,
      tokenAmount,
      sharesBurned
    );
  }

  async vote(voter: string, delegate: string, value: number): Promise<void> {
    await this.contract.methods.use(6, "vote", delegate, value, voter);
  }

  async veto(voter: string, value: number): Promise<void> {
    await this.contract.methods.use(7, "veto", value, voter);
  }

  async withdrawProfit(receiver: number): Promise<void> {
    await this.contract.use(3, "withdrawProfit", receiver);
  }

  async sendReward(amount: number): Promise<void> {
    await Tezos.contract.transfer({
      to: this.contract.address,
      amount: amount / tezPrecision,
    });
  }

  async approveToken(
    tokenAmount: number,
    address: string
  ): Promise<TransactionOperation> {
    await this.updateStorage();
    let token = await Token.at(this.storage.tokenAddress);
    let operation = await token.approve(address, tokenAmount);
    return operation;
  }
}
