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

let deployContract = async (Tezos, contractName, balance, inputDir, storageDir, outputDir) => {
    let operation = await Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync(`./${inputDir}/${contractName}.json`).toString()),
        storage: require(`../${storageDir}/${contractName}.js`),
        balance: balance
    });
    let contract = await operation.contract();
    const detail = {
        address: contract.address
    };

    fs.writeFileSync(`./${outputDir}/${contractName}.json`, JSON.stringify(detail));
    fs.writeFileSync(
        `./${outputDir}/${contract.address}.json`,
        JSON.stringify(detail)
    );
    console.log(`${contractName} deployed at: ${contract.address}`);
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
    .command('deploy <contract>')
    .description('build contracts')
    .option("-o, --output_dir <dir>", "Where store deployed contracts", "deploy")
    .option("-i, --input_dir <dir>", "Where built contracts are located", "build")
    .option("-s, --storage_dir <dir>", "Where built contracts are located", "storage")
    .option("-k, --key_path <file>", "Where private key is located", "key")
    .option("-p, --provider <provider>", "Node to connect", "https://api.tez.ie/rpc/carthagenet")
    .option("-b, --balance <balance>", "Where private key is located", "0")
    .action(async function (contract, options) {
        exec("mkdir -p " + options.output_dir);
        await setup(options.key_path, options.provider);
        deployContract(Tezos, contract, parseFloat(options.balance), options.input_dir, options.storage_dir, options.output_dir);
    });


program.parse(process.argv);