import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenFA2 } from "./tokenFA2";
import { defaultTokenId } from "./tokenFA2";
import { DexStorage } from "./types";
import { tezPrecision } from "./utils";
const standard = process.env.npm_package_config_standard;

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
      ledger?: string[];
      voters?: string[];
      vetos?: string[];
      votes?: string[];
      user_rewards?: string[];
    } = {}
  ): Promise<void> {
    const storage: any = await this.contract.storage();
    this.storage = {
      tez_pool: storage.storage.tez_pool,
      token_pool: storage.storage.token_pool,
      invariant: storage.storage.invariant,
      token_address: storage.storage.token_address,
      total_supply: storage.storage.total_supply,
      last_veto: storage.storage.last_veto,
      ledger: {},
      voters: {},
      vetos: {},
      votes: {},
      veto: storage.storage.veto,
      current_delegated: storage.storage.current_delegated,
      current_candidate: storage.storage.current_candidate,
      total_votes: storage.storage.total_votes,
      reward_info: storage.storage.reward_info,
      user_rewards: {},
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
    tezAmount: number,
    approve: boolean = true
  ): Promise<TransactionOperation> {
    if (approve) await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use("initializeExchange", tokenAmount)
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
      .use("tezToTokenPayment", minTokens, receiver)
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
      await tezos.signer.publicKeyHash()
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
    const operation = await this.contract.methods
      .use("tokenToTezPayment", tokenAmount, minTezOut, receiver)
      .send();
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
      await tezos.signer.publicKeyHash()
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
    let token = await tezos.contract.at(this.storage.token_address);
    const minTez = Math.floor(middleTezAmount * 0.9);
    const batch = tezos
      .batch([])
      .withTransfer(
        token.methods
          .update_operators([
            {
              add_operator: {
                owner: await tezos.signer.publicKeyHash(),
                operator: this.contract.address,
                token_id: defaultTokenId,
              },
            },
          ])
          .toTransferParams()
      )
      .withTransfer(
        this.contract.methods
          .use(
            "tokenToTezPayment",
            tokenAmount,
            middleTezAmount ? middleTezAmount : 1,
            await tezos.signer.publicKeyHash()
          )
          .toTransferParams()
      )
      .withTransfer(
        secondDexContract.methods
          .use("tezToTokenPayment", minTokensOut, receiver)
          .toTransferParams({ amount: middleTezAmount / tezPrecision })
      );
    const operation = await batch.send();
    await operation.confirmation();
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
      await tezos.signer.publicKeyHash()
    );
  }

  async investLiquidity(
    tokenAmount: number,
    tezAmount: number,
    minShares: number
  ): Promise<TransactionOperation> {
    await this.approveToken(tokenAmount, this.contract.address);
    const operation = await this.contract.methods
      .use("investLiquidity", minShares)
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
      .use("divestLiquidity", tezAmount, tokenAmount, sharesBurned)
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
      .use("vote", delegate, value, voter)
      .send();
    await operation.confirmation();
    return operation;
  }

  async veto(voter: string, value: number): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use("veto", value, voter)
      .send();
    await operation.confirmation();
    return operation;
  }

  async withdrawProfit(receiver: string): Promise<TransactionOperation> {
    const operation = await this.contract.methods
      .use("withdrawProfit", receiver)
      .send();
    await operation.confirmation();
    return operation;
  }

  async sendReward(amount: number): Promise<TransactionOperation> {
    const operation = await tezos.contract.transfer({
      to: this.contract.address,
      amount: amount / tezPrecision,
    });
    await operation.confirmation();
    return operation;
  }

  async approveToken(
    tokenAmount: number,
    address: string
  ): Promise<TransactionOperation> {
    await this.updateStorage();
    let tokenAddress = this.storage.token_address;
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .update_operators([
        {
          [(tokenAmount) ? "add_operator" : "remove_operator"]: {
            owner: await tezos.signer.publicKeyHash(),
            operator: address,
            token_id: defaultTokenId,
          },
        },
      ])
      .send();
    await operation.confirmation();
    return operation;
  }
}
