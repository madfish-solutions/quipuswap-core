const { program } = require("commander");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const { Tezos } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
let rpcProvider;
const getLigo = (isDockerizedLigo) => {
  let path = "ligo";
  if (isDockerizedLigo) {
    path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use global version...");
      path = "ligo";
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use Dockerized version...");
      path = "docker run -v $PWD:$PWD --rm -i ligolang/ligo:next";
      execSync(`${path}  --help`);
    }
  }
  return path;
};
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
    { maxBuffer: 1024 * 1000 },
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

const setup = async (keyPath, provider) => {
  const secretKey = fs.readFileSync(keyPath).toString().trim();
  rpcProvider = provider;
  return await Tezos.setProvider({
    rpc: provider,
    signer: await new InMemorySigner.fromSecretKey(secretKey),
    config: {
      confirmationPollingTimeoutSecond: 1000,
    },
  });
};

let deployContract = async (
  contractName,
  balance,
  inputDir,
  storageDir,
  outputDir,
  outputName,
  storageName,
  withInit
) => {
  storageName = storageName || contractName;
  let operation;
  if (withInit) {
    operation = await Tezos.contract.originate({
      code: JSON.parse(
        fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()
      ),
      init: JSON.parse(
        fs.readFileSync(`./${storageDir}/${storageName}.json`).toString()
      ),
      balance: balance,
    });
  } else {
    operation = await Tezos.contract.originate({
      code: JSON.parse(
        fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()
      ),
      storage: require(`../${storageDir}/${storageName}.js`),
      balance: balance,
    });
  }
  let contract = await operation.contract();
  const detail = {
    network: rpcProvider,
    address: contract.address,
  };
  outputName = outputName || contractName;
  fs.writeFileSync(`./${outputDir}/${outputName}.json`, JSON.stringify(detail));
  fs.writeFileSync(
    `./${outputDir}/${contract.address}.json`,
    JSON.stringify(detail)
  );
  console.log(`${contractName} deployed at: ${contract.address}`);
};

let addToken = async (tokenName, factoryName, inputDir) => {
  tokenName = tokenName || "Token";
  factoryName = factoryName || "Factory";
  const { address: tokenAddress } = JSON.parse(
    fs.readFileSync(`./${inputDir}/${tokenName}.json`).toString()
  );
  const { address: factoryAddress } = JSON.parse(
    fs.readFileSync(`./${inputDir}/${factoryName}.json`).toString()
  );

  const factoryContract = await Tezos.contract.at(factoryAddress);
  try {
    const operation = await factoryContract.methods
      .launchExchange(tokenAddress)
      .send();
    await operation.confirmation();
    console.log(`Dex for ${tokenAddress} deployed!`);
  } catch (E) {
    console.log(E);
  }
};

let setFunctions = async (
  num,
  functionName,
  dexName,
  contractName,
  inputDir,
  outputDir,
  isDockerizedLigo
) => {
  dexName = dexName || "Factory";
  contractName = contractName || "Factory";
  const { address: dexAddress } = JSON.parse(
    fs.readFileSync(`./${outputDir}/${dexName}.json`).toString()
  );
  let ligo = getLigo(isDockerizedLigo);
  exec(
    `${ligo} compile-parameter --michelson-format=json $PWD/${inputDir}/${contractName}.ligo main 'SetFunction(record index =${num}n; func = ${functionName}; end)'`,
    { maxBuffer: 1024 * 500 },
    async (err, stdout, stderr) => {
      if (err) {
        console.log(`Error during ${contractName} built`);
        console.log(err);
      } else {
        try {
          const operation = await Tezos.contract.transfer({
            to: dexAddress,
            amount: 0,
            parameter: {
              entrypoint: "setFunction",
              value: JSON.parse(stdout).args[0],
            },
          });
          await operation.confirmation();
          console.log(`Function ${functionName} added`);
        } catch (E) {
          console.log(E);
        }
      }
    }
  );
};

let setFunctionsFA2 = async (
  num,
  functionName,
  dexName,
  contractName,
  inputDir,
  outputDir,
  isDockerizedLigo
) => {
  dexName = dexName || "Factory";
  contractName = contractName || "Factory";
  const { address: dexAddress } = JSON.parse(
    fs.readFileSync(`./${outputDir}/${dexName}.json`).toString()
  );
  let ligo = getLigo(isDockerizedLigo);
  exec(
    `${ligo} compile-parameter --michelson-format=json $PWD/${inputDir}/${contractName}.ligo main 'SetFunction(record index =${num}n; func = ${functionName}; end)'`,
    { maxBuffer: 1024 * 500 },
    async (err, stdout, stderr) => {
      if (err) {
        console.log(`Error during ${contractName} built`);
        console.log(err);
      } else {
        try {
          const operation = await Tezos.contract.transfer({
            to: dexAddress,
            amount: 0,
            parameter: {
              entrypoint: "setFunction",
              value: JSON.parse(stdout).args[0],
            },
          });
          await operation.confirmation();
          console.log(`Function ${functionName} added`);
        } catch (E) {
          console.log(E);
        }
      }
    }
  );
};

let compileStorage = (
  contractName,
  inputDir,
  outputDir,
  params,
  outputName,
  isDockerizedLigo
) => {
  let ligo = getLigo(isDockerizedLigo);
  exec(
    `${ligo} compile-storage --michelson-format=json $PWD/${inputDir}/${contractName}.ligo main '${params}'`,
    { maxBuffer: 1024 * 500 },
    (err, stdout, stderr) => {
      if (err) {
        console.log(`Error during ${contractName} built`);
        console.log(stderr);
        console.log(err);
      } else {
        fs.writeFileSync(`./${outputDir}/${outputName}.json`, stdout);
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
  .command("compile_storage <contract> <params> [output_name]")
  .description("build contracts")
  .option("-o, --output_dir <dir>", "Where store builds", "storage")
  .option("-i, --input_dir <dir>", "Where files are located", "contracts")
  .option("-g, --no-dockerized_ligo", "Switch global ligo")
  .action(function (contract, params, output_name, options) {
    exec("mkdir -p " + options.output_dir);
    output_name = output_name || contract;
    compileStorage(
      contract,
      options.input_dir,
      options.output_dir,
      params,
      output_name,
      options.dockerized_ligo
    );
  });

program
  .command("add_token [token] [factory]")
  .description("add token")
  .option(
    "-i, --input_dir <dir>",
    "Where deployed contracts are located",
    "deploy"
  )
  .option(
    "-k, --key_path <file>",
    "Where private key is located",
    "fixtures/key"
  )
  .option(
    "-p, --provider <provider>",
    "Node to connect",
    "http://127.0.0.1:8732"
  )
  .action(async function (token, factory, options) {
    await setup(options.key_path, options.provider);
    await addToken(token, factory, options.input_dir);
  });

program
  .command("set_functions <num> <function_name> [dex] [contract]")
  .description("build contracts")
  .option("-o, --output_dir <dir>", "Where store deployed contracts", "deploy")
  .option(
    "-i, --input_dir <dir>",
    "Where built contracts are located",
    "contracts"
  )
  .option(
    "-k, --key_path <file>",
    "Where private key is located",
    "fixtures/key"
  )
  .option(
    "-p, --provider <provider>",
    "Node to connect",
    "http://127.0.0.1:8732"
  )
  .option("-g, --no-dockerized_ligo", "Switch global ligo")
  .option("-f, --fa2", "Set function to fa2 version", false)
  .action(async function (num, functionName, dex, contract, options) {
    await setup(options.key_path, options.provider);
    if (options.fa2) {
      await setFunctionsFA2(
        num,
        functionName,
        dex,
        contract,
        options.input_dir,
        options.output_dir,
        options.dockerized_ligo
      );
    } else {
      await setFunctions(
        num,
        functionName,
        dex,
        contract,
        options.input_dir,
        options.output_dir,
        options.dockerized_ligo
      );
    }
  });

program
  .command("deploy <contract> [output_name] [storage_name]")
  .description("deploy contracts")
  .option("-o, --output_dir <dir>", "Where store deployed contracts", "deploy")
  .option("-i, --input_dir <dir>", "Where built contracts are located", "build")
  .option(
    "-s, --storage_dir <dir>",
    "Where built contracts are located",
    "storage"
  )
  .option(
    "-k, --key_path <file>",
    "Where private key is located",
    "fixtures/key"
  )
  .option(
    "-p, --provider <provider>",
    "Node to connect",
    "http://127.0.0.1:8732"
  )
  .option("-b, --balance <balance>", "Where private key is located", "0")
  .option("-n, --init", "Wether to use init option")
  .action(async function (contract, output_name, storage_name, options) {
    exec("mkdir -p " + options.output_dir);
    await setup(options.key_path, options.provider);
    try {
      await deployContract(
        contract,
        parseFloat(options.balance),
        options.input_dir,
        options.storage_dir,
        options.output_dir,
        output_name,
        storage_name,
        options.init
      );
    } catch (e) {
      console.log(e);
    }
  });

program.parse(process.argv);
