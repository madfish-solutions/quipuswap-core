const fs = require("fs");
const program = require('commander');
const { Tezos } = require('@taquito/taquito');
program.version('0.0.1');

const setup = async () => {
    const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())

    Tezos.setProvider({ rpc: "https://rpcalpha.tzbeta.net" })

    await Tezos.importKey(email, password, mnemonic.join(" "), secret)
    return Tezos;
}

const prettyPrint = (obj) => JSON.stringify(obj, null, 2)

program.command("storage <address>")
    .action(async (address, command) => {
        try {
            const Tezos = await setup();
            const contract = await Tezos.contract.at(address)
            const storage = prettyPrint(await contract.storage());
            const rawStorage = prettyPrint(await Tezos.rpc.getStorage(address))
            console.log(`Storage:\n${storage}`)
            console.log(`Raw Storage:\n${rawStorage}`)
        } catch (ex) {
            console.error(ex)
        }
    })

program.command("account")
    .action(async () => {
        try {
            const Tezos = await setup();
            console.log(await Tezos.signer.publicKeyHash())
        } catch (ex) {
            console.error(ex)
        }
    })

    program.parse(process.argv);
