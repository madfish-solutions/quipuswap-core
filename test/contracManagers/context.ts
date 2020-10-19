import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { parseJsonSourceFileConfigFileContent } from "typescript";
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
    setFactoryFunctions: boolean = true,
    keyPath: string = process.env.npm_package_config_default_key
  ): Promise<Context> {
    let tezos = await setup(keyPath);
    let deployer = new Deployer(tezos);
    console.log("Deploying factory");
    let factory = await Factory.init(
      tezos,
      await deployer.deploy("Factory", true, "0")
    );
    let context = new Context(tezos, deployer, factory, [], []);
    if (setFactoryFunctions) {
      console.log("Setting functions");
      await context.setAllFactoryFunctions();
    }
    console.log("Creating pairs");
    await context.createPairs(pairsConfigs);
    return context;
  }

  async updateActor(
    keyPath: string = process.env.npm_package_config_default_key
  ): Promise<void> {
    let tezos = await setup(keyPath);

    this.tezos = tezos;
    await this.factory.updateProvider(tezos);

    for (let pair of this.pairs) {
      await pair.updateProvider(tezos);
    }
    for (let token of this.tokens) {
      await token.updateProvider(tezos);
    }
  }

  async createToken(): Promise<string> {
    let tokenAddress = await this.deployer.deploy("Token", false, "0");
    this.tokens.push(await TokenFA12.init(this.tezos, tokenAddress));
    return tokenAddress;
  }

  async setDexFactoryFunctions(): Promise<void> {
    let dexFunctions = [
      {
        index: 0,
        name: "initializeExchange",
      },
      {
        index: 1,
        name: "tezToToken",
      },
      {
        index: 2,
        name: "tokenToTez",
      },
      {
        index: 3,
        name: "withdrawProfit",
      },
      {
        index: 4,
        name: "investLiquidity",
      },
      {
        index: 5,
        name: "divestLiquidity",
      },
      {
        index: 6,
        name: "vote",
      },
      {
        index: 7,
        name: "veto",
      },
      {
        index: 8,
        name: "receiveReward",
      },
    ];
    for (let dexFunction of dexFunctions) {
      await this.factory.setDexFunction(dexFunction.index, dexFunction.name);
    }
    await this.factory.updateStorage({
      dexLambdas: [...Array(9).keys()],
    });
  }

  async setTokenFactoryFunctions(): Promise<void> {
    let tokenFunctions = [
      {
        index: 0,
        name: "transfer",
      },
      {
        index: 1,
        name: "approve",
      },
      {
        index: 2,
        name: "getBalance",
      },
      {
        index: 3,
        name: "getAllowance",
      },
      {
        index: 4,
        name: "getTotalSupply",
      },
    ];
    for (let tokenFunction of tokenFunctions) {
      await this.factory.setTokenFunction(
        tokenFunction.index,
        tokenFunction.name
      );
    }
    await this.factory.updateStorage({
      tokenLambdas: [...Array(5).keys()],
    });
  }

  async setAllFactoryFunctions(): Promise<void> {
    await this.setDexFactoryFunctions();
    await this.setTokenFactoryFunctions();
    await this.factory.updateStorage({
      dexLambdas: [...Array(9).keys()],
      tokenLambdas: [...Array(5).keys()],
    });
  }

  async createPair(
    pairConfig: {
      tezAmount: number;
      tokenAmount: number;
      tokenAddress?: string | null;
    } = {
      tezAmount: 10000,
      tokenAmount: 1000000,
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
      tokenAddress?: string | null;
    }[] = [
      {
        tezAmount: 10000,
        tokenAmount: 1000000,
      },
    ]
  ): Promise<void> {
    for (let pairConfig of pairConfigs) {
      await this.createPair(pairConfig);
    }
  }
}
