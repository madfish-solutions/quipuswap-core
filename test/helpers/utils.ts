import { execSync } from "child_process";
import { InMemorySigner } from "@taquito/signer";
import { TransactionOperation } from "@taquito/taquito/dist/types/operations/transaction-operation";
import accounts from "../accounts/accounts";
export const tezPrecision = 1e6;

export function getLigo(isDockerizedLigo: boolean): string {
  let path = "ligo";
  let ligoVersion = process.env.LIGO_VERSION;
  if (isDockerizedLigo) {
    path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${ligoVersion}`;
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
      path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${ligoVersion}`;
      execSync(`${path}  --help`);
    }
  }
  return path;
}

export async function prepareProviderOptions(
  name: string = "alice"
): Promise<{ signer: InMemorySigner; config: object }> {
  const secretKey = accounts[name].sk.trim();
  return {
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
    let operation = await tezos.contract.transfer({
      to: await tezos.signer.publicKeyHash(),
      amount: 1,
    });
    await operation.confirmation();
  }
}
