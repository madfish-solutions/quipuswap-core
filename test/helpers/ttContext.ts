const standard = process.env.EXCHANGE_TOKEN_STANDARD;

import { TTDex as TTDexFA12 } from "./ttdexFA12";
import { TTDex as TTDexFA2 } from "./ttdexFA2";
import { TokenFA12 } from "./tokenFA12";
import { prepareProviderOptions } from "./utils";

import dexStorage from "../storage/TTDex";
import tokenFA12Storage from "../storage/TokenFA12";
import tokenFA2Storage from "../storage/TokenFA2";
import { dexFunctions, tokenFunctions } from "../storage/TTFunctions";
import { TokenFA2 } from "./tokenFA2";
import { Token } from "./token";
import { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";

let tokenStorage, CDex, CToken;
type Dex = TTDexFA12 | TTDexFA2;
if (standard == "FA2") {
  tokenStorage = tokenFA2Storage;
  CDex = artifacts.require("TTDexFA2");
  CToken = artifacts.require("TokenFA2");
} else {
  tokenStorage = tokenFA12Storage;
  CDex = artifacts.require("TTDexFA12");
  CToken = artifacts.require("TokenFA12");
}

export class TTContext {
  public dex: Dex;
  public tokens: Token[];

  constructor(dex: Dex, tokens: Token[]) {
    this.dex = dex;
    this.tokens = tokens;
  }

  static async init(
    pairsConfigs: {
      tokenAAddress?: string | null;
      tokenBAddress?: string | null;
      tokenAId?: string | null;
      tokenBId?: string | null;
      tokenAAmount: number;
      tokenBAmount: number;
    }[] = [
      {
        tokenAAmount: 1000000,
        tokenBAmount: 1000000,
      },
    ],
    setDexFunctions: boolean = false,
    accountName: string = "alice",
    useDeployedDex: boolean = true
  ): Promise<TTContext> {
    let config = await prepareProviderOptions(accountName);
    tezos = new TezosToolkit(tezos.rpc.url);
    tezos.setProvider(config);

    let dexInstance = useDeployedDex
      ? await CDex.deployed()
      : await CDex.new(dexStorage);
    let dex =
      standard === "FA2"
        ? await TTDexFA2.init(dexInstance.address.toString())
        : await TTDexFA12.init(dexInstance.address.toString());

    let context = new TTContext(dex, []);
    if (setDexFunctions) {
      await context.setAllDexFunctions();
    }

    await context.createPairs(pairsConfigs);

    return context;
  }

  async updateActor(accountName: string = "alice"): Promise<void> {
    await this.dex.updateProvider(accountName);
  }

  async flushPairs(): Promise<void> {
    this.tokens = [];
    this.dex = undefined;
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

  async setDexFunctions(): Promise<void> {
    for (let dexFunction of dexFunctions) {
      await this.dex.setDexFunction(dexFunction.index, dexFunction.name);
    }
    await this.dex.updateStorage({
      dex_lambdas: [...Array(9).keys()],
    });
  }

  async setDexFunction(index: number, name: string): Promise<void> {
    await this.dex.updateStorage({
      dex_lambdas: [index],
    });
    if (!this.dex.storage.dex_lambdas[index]) {
      await this.dex.setDexFunction(index, name);
      await this.dex.updateStorage({
        dex_lambdas: [index],
      });
    }
  }

  async setTokenDexFunctions(): Promise<void> {
    for (let tokenFunction of tokenFunctions["FA2"]) {
      await this.dex.setTokenFunction(tokenFunction.index, tokenFunction.name);
    }
    await this.dex.updateStorage({
      token_lambdas: [...Array(5).keys()],
    });
  }

  async setAllDexFunctions(): Promise<void> {
    await this.setDexFunctions();
    await this.setTokenDexFunctions();
    await this.dex.updateStorage({
      dex_lambdas: [...Array(9).keys()],
      token_lambdas: [...Array(5).keys()],
    });
  }

  async createPair(
    pairConfig: {
      tokenAAddress?: string | null;
      tokenBAddress?: string | null;
      tokenAId?: string | null;
      tokenBId?: string | null;
      tokenAAmount: number;
      tokenBAmount: number;
    } = {
      tokenAAmount: 1000000,
      tokenBAmount: 1000000,
    }
  ): Promise<BigNumber> {
    pairConfig.tokenAAddress =
      pairConfig.tokenAAddress || (await this.createToken());
    pairConfig.tokenBAddress =
      pairConfig.tokenBAddress || (await this.createToken());
    if (pairConfig.tokenAAddress > pairConfig.tokenBAddress) {
      const tmp = pairConfig.tokenAAddress;
      pairConfig.tokenAAddress = pairConfig.tokenBAddress;
      pairConfig.tokenBAddress = tmp;
    }
    await this.dex.initializeExchange(
      pairConfig.tokenAAddress,
      pairConfig.tokenBAddress,
      pairConfig.tokenAAmount,
      pairConfig.tokenBAmount
    );
    return this.dex.storage.token_to_id[
      this.dex.storage.pairs_count.toString()
    ];
  }

  async createPairs(
    pairConfigs: {
      tokenAAddress?: string | null;
      tokenBAddress?: string | null;
      tokenAId?: string | null;
      tokenBId?: string | null;
      tokenAAmount: number;
      tokenBAmount: number;
    }[] = [
      {
        tokenAAmount: 1000000,
        tokenBAmount: 1000000,
      },
    ]
  ): Promise<void> {
    for (let pairConfig of pairConfigs) {
      await this.createPair(pairConfig);
    }
  }
}
