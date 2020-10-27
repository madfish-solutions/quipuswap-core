import {
  TezosToolkit,
  ContractAbstraction,
  ContractProvider,
  Tezos,
} from "@taquito/taquito";
import fs = require("fs");
import path = require("path");
import { execSync } from "child_process";
import { InMemorySigner } from "@taquito/signer";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import { BatchOperation } from "@taquito/taquito/dist/types/operations/batch-operation";
import accounts from "../accounts/accounts";
export const provider = process.env.npm_package_config_network;
export const tezPrecision = 1e6;

export function getLigo(isDockerizedLigo: boolean): string {
  let path = "ligo";
  if (isDockerizedLigo) {
    path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = "ligo";
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
      execSync(`${path}  --help`);
    }
  }
  return path;
}

export async function prepareProviderOptions(
  name: string = "alice"
): Promise<{ rpc: string; signer: InMemorySigner; config: object }> {
  const secretKey = accounts[name].sk.trim();
  return {
    rpc: provider,
    signer: await InMemorySigner.fromSecretKey(secretKey),
    config: {
      confirmationPollingTimeoutSecond: 10000,
    },
  };
}

export function calculateFee(
  operations: TransactionOperation[],
  address: string
): number {
  return operations.reduce((prev, current) => {
    let trxFee = current.fee;
    let internalFees = current.operationResults.reduce((prev, current) => {
      let balanceUpdates = current.metadata.operation_result.balance_updates;
      if (balanceUpdates) {
        return (
          prev +
          balanceUpdates.reduce(
            (prev, current) =>
              prev -
              (current.kind === "contract" && current.contract === address
                ? parseInt(current.change)
                : 0),
            0
          )
        );
      }
      return prev;
    }, 0);
    return prev + trxFee + internalFees;
  }, 0);
}

export async function bakeBlocks(count: number) {
  for (let i = 0; i < count; i++) {
    let operation = await Tezos.contract.transfer({
      to: await Tezos.signer.publicKeyHash(),
      amount: 1,
    });
    await operation.confirmation();
  }
}
