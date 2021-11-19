import { execSync } from "child_process";
import { getLigo, migrate } from "../scripts/helpers";
import { confirmOperation } from "../scripts/confirmation";
import { fa12TokenStorage } from "../storage/TokenFA12";
import { fa2TokenStorage } from "../storage/TokenFA2";
const initialTezAmount = 1;
const initialTokenAmount = 1000000;
const defaultTokenId = 0;

export = async (tezos, network) => {
  const standard: string = "FA12";
  const ligo = getLigo(true);

  const dexStorage = execSync(
    `${ligo} compile storage $PWD/contracts/main/Dex.ligo  initial_storage --warn false --michelson-format json`,
    { maxBuffer: 1024 * 500 }
  );
  const deployedDex = await migrate(
    tezos,
    "Dex",
    JSON.parse(dexStorage.toString()),
    true
  );
  console.log(`TTDex address: ${deployedDex}`);

  if (network != "mainnet") {
    const dexInstance = await tezos.contract.at(deployedDex);
    const sender = await tezos.signer.publicKeyHash();

    let token0Instance;
    let token1Instance;
    switch (standard) {
      case "MIXED":
        token0Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA12", fa12TokenStorage)
        );
        token1Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA2", fa2TokenStorage)
        );
        let approveMixed = await token0Instance.methods
          .approve(deployedDex, initialTokenAmount)
          .send();
        await confirmOperation(tezos, approveMixed.hash);
        approveMixed = await token1Instance.methods
          .update_operators([
            {
              add_operator: {
                owner: sender,
                operator: dexInstance.address.toString(),
                token_id: defaultTokenId,
              },
            },
          ])
          .send();
        await confirmOperation(tezos, approveMixed.hash);
        const investMixed = await dexInstance.methods
          .use(
            "addPair",
            "fa12",
            token0Instance.address.toString(),
            "fa2",
            token1Instance.address.toString(),
            defaultTokenId,
            initialTokenAmount,
            initialTokenAmount
          )
          .send();
        await confirmOperation(tezos, investMixed.hash);

        break;
      case "FA12":
        token0Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA12", fa12TokenStorage)
        );
        token1Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA12", fa12TokenStorage)
        );
        let approveFA12 = await token0Instance.methods
          .approve(deployedDex, initialTokenAmount)
          .send();
        await confirmOperation(tezos, approveFA12.hash);
        approveFA12 = await token1Instance.methods
          .approve(deployedDex, initialTokenAmount)
          .send();
        await confirmOperation(tezos, approveFA12.hash);
        const orderedFa12 =
          token0Instance.address.toString() < token1Instance.address.toString();
        const investFa12 = await dexInstance.methods
          .use(
            "addPair",
            "fa12",
            orderedFa12
              ? token0Instance.address.toString()
              : token1Instance.address.toString(),
            "fa12",
            orderedFa12
              ? token1Instance.address.toString()
              : token0Instance.address.toString(),
            initialTokenAmount,
            initialTokenAmount
          )
          .send();
        await confirmOperation(tezos, investFa12.hash);
        break;
      case "FA2":
        token0Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA2", fa2TokenStorage)
        );
        token1Instance = await tezos.contract.at(
          await migrate(tezos, "TokenFA2", fa2TokenStorage)
        );
        let approveFA2 = await token0Instance.methods
          .update_operators([
            {
              add_operator: {
                owner: sender,
                operator: dexInstance.address.toString(),
                token_id: defaultTokenId,
              },
            },
          ])
          .send();
        await confirmOperation(tezos, approveFA2.hash);
        approveFA2 = await token1Instance.methods
          .update_operators([
            {
              add_operator: {
                owner: sender,
                operator: dexInstance.address.toString(),
                token_id: defaultTokenId,
              },
            },
          ])
          .send();
        await confirmOperation(tezos, approveFA2.hash);
        const orderedFa2 =
          token0Instance.address.toString() < token1Instance.address.toString();
        const investFa2 = await dexInstance.methods
          .use(
            "addPair",
            "fa2",
            orderedFa2
              ? token0Instance.address.toString()
              : token1Instance.address.toString(),
            defaultTokenId,
            "fa2",
            orderedFa2
              ? token1Instance.address.toString()
              : token0Instance.address.toString(),
            defaultTokenId,
            initialTokenAmount,
            initialTokenAmount
          )
          .send();
        await confirmOperation(tezos, investFa2.hash);

        break;
      default:
        break;
    }
    console.log(`Token 1 address: ${token0Instance.address}`);
    console.log(`Token 2 address: ${token1Instance.address}`);
  }
};
