import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { Deployer } from "./deployer";
import { Dex } from "./dex";
import { Factory } from "./factory";
import { TokenFA12 } from "./tokenFA12";
import { setup } from "./utils";

export class Context {
  public tezos: TezosToolkit;
  public factory: Factory;
  public pairs: Dex[];
  public tokens: TokenFA12[];
  readonly deployer: Deployer;

  constructor(
    tezos: TezosToolkit,
    deployer: Deployer,
    factory: Factory,
    pairs: Dex[],
    tokens: TokenFA12[]
  ) {
    this.tezos = tezos;
    this.deployer = deployer;
    this.factory = factory;
    this.pairs = pairs;
    this.tokens = tokens;
  }

  static async init(
    pairsConfigs: { tezAmount: number; tokenAmount: number }[] = [
      { tezAmount: 10000, tokenAmount: 1000000 },
      { tezAmount: 10000, tokenAmount: 1000000 },
    ],
    keyPath: string = process.env.npm_package_config_default_key
  ): Promise<Context> {
    let tezos = await setup(keyPath);
    let deployer = new Deployer(tezos);
    let factory = await Factory.init(
      tezos,
      await deployer.deploy("Factory", true, "0")
    );
    let tokens = [];
    let pairs = [];
    for (const pairsConfig of pairsConfigs) {
      let tokenAddress = await deployer.deploy("Token", false, "0");
      tokens.push(await TokenFA12.init(tezos, tokenAddress));
      await factory.launchExchange(
        tokenAddress,
        pairsConfig.tokenAmount,
        pairsConfig.tezAmount
      );
      pairs.push(
        await Dex.init(tezos, factory.storage.tokenToExchange[tokenAddress])
      );
    }
    return new Context(tezos, deployer, factory, pairs, tokens);
  }

  async updateActor(
    keyPath: string = process.env.npm_package_config_default_key
  ): Promise<void> {
    let tezos = await setup(keyPath);

    this.tezos = tezos;
    this.factory.tezos = tezos;

    for (let pair of this.pairs) {
      pair.tezos = tezos;
    }
    for (let token of this.tokens) {
      token.tezos = tezos;
    }
  }

  async createToken(): Promise<string> {
    let tokenAddress = await this.deployer.deploy("Token", false, "0");
    this.tokens.push(await TokenFA12.init(this.tezos, tokenAddress));
    return tokenAddress;
  }

  async createPair(
    pairConfig: {
      tezAmount: number;
      tokenAmount: number;
      tokenAddress: string | null;
    } = {
      tezAmount: 10000,
      tokenAmount: 1000000,
      tokenAddress: null,
    }
  ): Promise<string> {
    pairConfig.tokenAddress =
      pairConfig.tokenAddress || (await this.createToken());
    await this.factory.launchExchange(
      pairConfig.tokenAddress,
      pairConfig.tokenAmount,
      pairConfig.tezAmount
    );
    this.pairs.push(
      await Dex.init(
        this.tezos,
        this.factory.storage.tokenToExchange[pairConfig.tokenAddress]
      )
    );
    return this.factory.storage.tokenToExchange[pairConfig.tokenAddress];
  }

  async createPairs(
    pairConfigs: {
      tezAmount: number;
      tokenAmount: number;
      tokenAddress: string | null;
    }[] = [
      {
        tezAmount: 10000,
        tokenAmount: 1000000,
        tokenAddress: null,
      },
    ]
  ): Promise<void> {
    for (let pairConfig of pairConfigs) {
      this.createPair(pairConfig);
    }
  }
}
