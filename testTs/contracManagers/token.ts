import {
  Tezos,
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
} from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenFA12 } from "./tokenFA12";
import { TokenFA2 } from "./tokenFA2";
import { TokenStorage } from "./types";
import { prepareProviderOptions } from "./utils";
export const defaultTokenId = 0;

export interface Token {
  contract: ContractAbstraction<ContractProvider>;
  storage: TokenStorage;

  updateProvider(accountName: string): Promise<void>;

  updateStorage(maps: { ledger?: string[] }): Promise<void>;
  transfer(
    from: string,
    to: string,
    amount: number
  ): Promise<TransactionOperation>;

  approve(to: string, amount: number): Promise<TransactionOperation>;
}
