import { execSync } from "child_process";
import { getLigo, migrate } from "../scripts/helpers";
import { confirmOperation } from "../scripts/confirmation";

export = async (tezos) => {
  const ligo = getLigo(true);
  //   console.log(
  //     Buffer.from(
  //       JSON.stringify({
  //         version: "v0.0.1",
  //         description: "Quipuswap Share Pool Token",
  //         name: "Quipu LP Token",
  //         authors: ["Madfish.Solutions <info@madfish.solutions>"],
  //         homepage: "https://quipuswap.com/",
  //         source: {
  //           tools: ["Ligo", "Flextesa"],
  //           location: "https://ligolang.org/",
  //         },
  //         interfaces: ["TZIP-12", "TZIP-16"],
  //       }),
  //       "ascii"
  //     ).toString("hex")
  //   );

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
};
