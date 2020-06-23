const { program } = require('commander');
const { exec } = require("child_process");
const fs = require("fs");
const { Tezos } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");

let buildContract = (contractName, inputDir, outputDir) => {
    exec(
        `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract --michelson-format=json $PWD/${inputDir}/${contractName}.ligo main`,
        { maxBuffer: 1024 * 500 },
        (err, stdout, stderr) => {
            if (err) {
                console.log(`Error during ${contractName} built`);
                console.log(stderr);
            } else {
                console.log(`${contractName} built`);
                fs.writeFileSync(`./${outputDir}/${contractName}.json`, stdout);
            }
        }
    );
}

const setup = async (keyPath, provider) => {
    const secretKey = fs.readFileSync(keyPath).toString();

    return await Tezos.setProvider({ rpc: provider, signer: await new InMemorySigner.fromSecretKey(secretKey) });
};

let deployContract = async (contractName, balance, inputDir, storageDir, outputDir, outputName, storageName, withInit) => {
    storageName = storageName || contractName;
    let operation;
    if (withInit) {
        operation = await Tezos.contract.originate({
            code: JSON.parse(fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()),
            init: JSON.parse(fs.readFileSync(`./${storageDir}/${storageName}.json`).toString()),
            balance: balance
        });
    } else {
        operation = await Tezos.contract.originate({
            code: JSON.parse(fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()),
            storage: require(`../${storageDir}/${storageName}.js`),
            balance: balance
        });
    }
    let contract = await operation.contract();
    const detail = {
        address: contract.address
    };
    outputName = outputName || contractName;
    fs.writeFileSync(`./${outputDir}/${outputName}.json`, JSON.stringify(detail));
    fs.writeFileSync(
        `./${outputDir}/${contract.address}.json`,
        JSON.stringify(detail)
    );
    console.log(`${contractName} deployed at: ${contract.address}`);
}

let tokenToTokenSwap = async (tokensIn, minTokensOut, dexName, tokenFromName, tokenToName, inputDir) => {
    dexName = dexName || "Dex";
    tokenFromName = tokenFromName || "Token";
    tokenToName = tokenToName || "Token2";
    const { address: tokenFromAddress } = JSON.parse(
        fs.readFileSync(`./${inputDir}/${tokenFromName}.json`).toString()
    );
    const { address: tokenToAddress } = JSON.parse(
        fs.readFileSync(`./${inputDir}/${tokenToName}.json`).toString()
    );
    const { address: dexAddress } = JSON.parse(
        fs.readFileSync(`./${inputDir}/${dexName}.json`).toString()
    );

    const tokenFromContract = await Tezos.contract.at(tokenFromAddress);
    const dexContract = await Tezos.contract.at(dexAddress);

    const operation0 = await tokenFromContract.methods
        .approve(dexAddress, tokensIn)
        .send();
    await operation0.confirmation();

    try {
        const operation1 = await dexContract.methods
            .tokenToTokenSwap(tokensIn, minTokensOut.toString(), tokenToAddress)
            .send();
        await operation1.confirmation();
        console.log(operation1);
    } catch (e) {
        console.log(e);
    }
}

let setSettings = async (num, functionName, dexName, inputDir, outputDir) => {
    dexName = dexName || "Dex";
    const { address: dexAddress } = JSON.parse(
        fs.readFileSync(`./${outputDir}/${dexName}.json`).toString()
    );
    exec(
        `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-parameter --michelson-format=json $PWD/${inputDir}/${dexName}.ligo main 'SetSettings(${num}n, ${functionName})'`,
        { maxBuffer: 1024 * 500 },
        async (err, stdout, stderr) => {
            if (err) {
                console.log(`Error during ${contractName} built`);
                console.log(stderr);
            } else {
                try {
                    const operation = await Tezos.contract.transfer({ to: dexAddress, amount: 0, parameter: { entrypoint: "default", value: JSON.parse(stdout) } })
                    await operation.confirmation();
                    console.log(operation);
                } catch (E) { console.log(E) }


            }
        }
    );

}

program
    .version('0.1.0')

program
    .command('build [contract]')
    .description('build contracts')
    .option("-o, --output_dir <dir>", "Where store builds", "build")
    .option("-i, --input_dir <dir>", "Where files are located", "contracts")
    .action(function (contract, options) {
        let contractName = contract || "*";
        exec("mkdir -p " + options.output_dir);
        if (contractName === "*") {
            fs.readdirSync(options.input_dir).forEach(file => {
                let fileParts = file.split('.');
                if (fileParts.length === 2 && fileParts.pop() === "ligo") {
                    buildContract(fileParts[0], options.input_dir, options.output_dir);
                }
            });

        } else {
            buildContract(contractName, options.input_dir, options.output_dir);
        }
    });


program
    .command('token_to_token <tokens_in> <min_tokens_out> [dex] [token_from] [token_to]')
    .description('build contracts')
    .option("-i, --input_dir <dir>", "Where built contracts are located", "deploy")
    .option("-k, --key_path <file>", "Where private key is located", "key")
    .option("-p, --provider <provider>", "Node to connect", "https://testnet-tezos.giganode.io")
    .action(async function (tokens_in, min_tokens_out, dex, token_from, token_to, options) {
        await setup(options.key_path, options.provider);
        await tokenToTokenSwap(tokens_in, min_tokens_out, dex, token_from, token_to, options.input_dir);
    });

program
    .command('set_settings <num> <function_name> [dex]')
    .description('build contracts')
    .option("-o, --output_dir <dir>", "Where store deployed contracts", "deploy")
    .option("-i, --input_dir <dir>", "Where built contracts are located", "contracts")
    .option("-k, --key_path <file>", "Where private key is located", "key")
    .option("-p, --provider <provider>", "Node to connect", "https://testnet-tezos.giganode.io")
    .action(async function (num, functionName, dex, options) {
        await setup(options.key_path, options.provider);
        await setSettings(num, functionName, dex, options.input_dir, options.output_dir);
    });

program
    .command('deploy <contract> [output_name] [storage_name]')
    .description('build contracts')
    .option("-o, --output_dir <dir>", "Where store deployed contracts", "deploy")
    .option("-i, --input_dir <dir>", "Where built contracts are located", "build")
    .option("-s, --storage_dir <dir>", "Where built contracts are located", "storage")
    .option("-k, --key_path <file>", "Where private key is located", "key")
    .option("-p, --provider <provider>", "Node to connect", "https://testnet-tezos.giganode.io")
    .option("-b, --balance <balance>", "Where private key is located", "0")
    .option("-n, --init", "Wether to use init option")
    .action(async function (contract, output_name, storage_name, options) {
        exec("mkdir -p " + options.output_dir);
        await setup(options.key_path, options.provider);
        try {
            await deployContract(contract, parseFloat(options.balance), options.input_dir, options.storage_dir, options.output_dir, output_name, storage_name, options.init);
        } catch (e) {
            console.log(e);
        }
    });


program.parse(process.argv);