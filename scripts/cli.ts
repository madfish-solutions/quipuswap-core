import yargs from "yargs";

import { compile, compileLambdas, runMigrations } from "./helpers";

yargs
  .command(
    "compile [format] [contract] [contracts_dir] [output_dir] [ligo_version]",
    "compiles the contract",
    {
      format: {
        description: "fromat of output file",
        alias: "f",
        type: "string",
      },
      contract: {
        description: "the contract to compile",
        alias: "c",
        type: "string",
      },
      contracts_dir: {
        description: "contracts directory",
        alias: "p",
        type: "string",
      },
      output_dir: {
        description: "output directory",
        alias: "o",
        type: "string",
      },
      ligo_version: {
        description: "ligo version",
        alias: "v",
        type: "string",
      },
    },
    async (argv) => {
      compile(
        argv.format,
        argv.contract,
        argv.contracts_dir,
        argv.output_dir,
        argv.ligo_version
      );
    }
  )
  .command(
    "compile-lambda [json] [contract]",
    "compile lambdas for the specified contract",
    {
      json: {
        description:
          "input file relative path (with lambdas indexes and names)",
        alias: "j",
        type: "string",
      },
      contract: {
        description: "input file realtive path (with lambdas Ligo code)",
        alias: "c",
        type: "string",
      },
    },
    async (argv) => {
      compileLambdas(argv.json, argv.contract);
    }
  )
  .command(
    "migrate [network] [from] [to]",
    "run migrations",
    {
      from: {
        description: "the migrations counter to start with",
        alias: "f",
        type: "number",
      },
      to: {
        description: "the migrations counter to end with",
        alias: "t",
        type: "number",
      },
      network: {
        description: "the network to deploy",
        alias: "n",
        type: "string",
      },
    },
    async (argv) => {
      runMigrations(argv.from, argv.to, argv.network);
    }
  )
  .help()
  .strictCommands()
  .demandCommand(1)
  .alias("help", "h").argv;
