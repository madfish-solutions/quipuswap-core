require("dotenv").config();

const { program } = require("commander");
const { exec } = require("child_process");
const fs = require("fs");
const { getLigo } = require("../scripts/utils");

const buildContract = (
  contractName,
  inputDir,
  outputDir,
  jsonFormat,
  isDockerizedLigo
) => {
  let ligo = getLigo(isDockerizedLigo);
  exec(
    `${ligo} compile-contract ${
      jsonFormat ? "--michelson-format=json" : ""
    } $PWD/${inputDir}/${contractName}.ligo main`,
    { maxBuffer: 1024 * 10000 },
    (err, stdout, stderr) => {
      if (err) {
        console.log(`Error during ${contractName} built`);
        console.log(err);
      } else {
        console.log(`${contractName} built`);
        fs.writeFileSync(
          `./${outputDir}/${contractName}.${jsonFormat ? "json" : "tz"}`,
          stdout
        );
      }
    }
  );
};

program.version("0.1.0");

program
  .command("build [contract]")
  .description("build contracts")
  .option("-o, --output_dir <dir>", "Where store builds", "build")
  .option("-i, --input_dir <dir>", "Where files are located", "contracts")
  .option("-j, --no-json", "The format of output file")
  .option("-g, --no-dockerized_ligo", "Switch global ligo")
  .action(function (contract, options) {
    let contractName = contract || "*";
    exec("mkdir -p " + options.output_dir);
    if (contractName === "*") {
      fs.readdirSync(options.input_dir).forEach((file) => {
        let fileParts = file.split(".");
        if (fileParts.length === 2 && fileParts.pop() === "ligo") {
          buildContract(fileParts[0], options.input_dir, options.output_dir);
        }
      });
    } else {
      buildContract(
        contractName,
        options.input_dir,
        options.output_dir,
        options.json,
        options.dockerized_ligo
      );
    }
  });

program
  .command("build-dex")
  .description(
    "builds core contracts of the QuipuSwap (standard is selected based on EXCHANGE_TOKEN_STANDARD env variable)"
  )
  .option("-o, --output_dir <dir>", "Where store builds", "build")
  .option("-i, --input_dir <dir>", "Where files are located", "contracts")
  .option("-j, --no-json", "The format of output file")
  .option("-g, --no-dockerized_ligo", "Switch global ligo")
  .action(function (options) {
    if (process.env.EXCHANGE_TOKEN_STANDARD == "FA2FA12") return;
    let contractName = `./main/Dex${process.env.EXCHANGE_TOKEN_STANDARD}`;
    exec("mkdir -p " + options.output_dir);
    if (contractName === "*") {
      fs.readdirSync(options.input_dir).forEach((file) => {
        let fileParts = file.split(".");
        if (fileParts.length === 2 && fileParts.pop() === "ligo") {
          buildContract(fileParts[0], options.input_dir, options.output_dir);
        }
      });
    } else {
      buildContract(
        contractName,
        options.input_dir,
        options.output_dir,
        options.json,
        options.dockerized_ligo
      );
    }
  });

program.parse(process.argv);
