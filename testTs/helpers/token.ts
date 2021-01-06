import { ContractAbstraction, ContractProvider } from "@taquito/taquito";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { TokenStorage } from "./types";
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
