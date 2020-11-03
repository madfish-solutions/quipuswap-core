const standard = process.env.npm_package_config_standard;

import {
  Tezos,
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { Dex as DexFA12 } from "./dexFA12";
import { Dex as DexFA2 } from "./dexFA2";
import { Factory } from "./factory";
import { TokenFA12 } from "./tokenFA12";
import { prepareProviderOptions } from "./utils";

import factoryStorage from "../storage/Factory";
import tokenFA12Storage from "../storage/TokenFA12";
import tokenFA2Storage from "../storage/TokenFA2";
import { dexFunctions, tokenFunctions } from "../storage/Functions";
import { TokenFA2 } from "./tokenFA2";
import { Token } from "./token";

let tokenStorage, CDex, CToken, CFactory;
type Dex = DexFA12 | DexFA2;
if (standard == "FA12") {
  tokenStorage = tokenFA12Storage;
  CDex = artifacts.require("DexFA12");
  CToken = artifacts.require("TokenFA12");
  CFactory = artifacts.require("FactoryFA12");
} else {
  tokenStorage = tokenFA2Storage;
  CDex = artifacts.require("DexFA2");
  CToken = artifacts.require("TokenFA2");
  CFactory = artifacts.require("FactoryFA2");
}

export class Context {
  public factory: Factory;
  public pairs: Dex[];
  public tokens: Token[];

  constructor(factory: Factory, pairs: Dex[], tokens: Token[]) {
    this.factory = factory;
    this.pairs = pairs;
    this.tokens = tokens;
  }

  static async init(
    pairsConfigs: { tezAmount: number; tokenAmount: number }[] = [
      { tezAmount: 10000, tokenAmount: 1000000 },
    ],
    setFactoryFunctions: boolean = false,
    accountName: string = "alice",
    useDeployedFactory: boolean = true
  ): Promise<Context> {
    let config = await prepareProviderOptions(accountName);
    Tezos.setProvider(config);

    let factoryInstance = useDeployedFactory
      ? await CFactory.deployed()
      : await CFactory.new(factoryStorage);
    let factory = await Factory.init(factoryInstance.address.toString());

    let context = new Context(factory, [], []);
    if (setFactoryFunctions) {
      await context.setAllFactoryFunctions();
    }

    await context.createPairs(pairsConfigs);
    return context;
  }

  async updateActor(accountName: string = "alice"): Promise<void> {
    await this.factory.updateProvider(accountName);
  }

  async flushPairs(): Promise<void> {
    this.tokens = [];
    this.pairs = [];
    await this.updateActor();
  }

  async createToken(): Promise<string> {
    let tokenInstance = await CToken.new(tokenStorage);
    let tokenAddress = tokenInstance.address.toString();
    this.tokens.push(
      standard === "FA2"
        ? await TokenFA2.init(tokenAddress)
        : await TokenFA12.init(tokenAddress)
    );
    return tokenAddress;
  }

  async setDexFactoryFunctions(): Promise<void> {
    for (let dexFunction of dexFunctions) {
      await this.factory.setDexFunction(dexFunction.index, dexFunction.name);
    }
    await this.factory.updateStorage({
      dex_lambdas: [...Array(9).keys()],
    });
  }

  async setTokenFactoryFunctions(): Promise<void> {
    for (let tokenFunction of tokenFunctions[standard]) {
      await this.factory.setTokenFunction(
        tokenFunction.index,
        tokenFunction.name
      );
    }
    await this.factory.updateStorage({
      token_lambdas: [...Array(5).keys()],
    });
  }

  async setAllFactoryFunctions(): Promise<void> {
    await this.setDexFactoryFunctions();
    await this.setTokenFactoryFunctions();
    await this.factory.updateStorage({
      dex_lambdas: [...Array(9).keys()],
      token_lambdas: [...Array(5).keys()],
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
      standard == "FA12"
        ? await DexFA12.init(
            this.factory.storage.token_to_exchange[pairConfig.tokenAddress]
          )
        : await DexFA2.init(
            this.factory.storage.token_to_exchange[pairConfig.tokenAddress]
          )
    );
    return this.factory.storage.token_to_exchange[pairConfig.tokenAddress];
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
