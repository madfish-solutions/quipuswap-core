const { Tezos } = require('@taquito/taquito')
const { exec } = require("child_process");
const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet2.json').toString())
var receiver;
Tezos.setProvider({ rpc: "https://rpcalpha.tzbeta.net" })

exec("mkdir -p deployed")
Tezos.importKey(email, password, mnemonic.join(" "), secret).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Token.json").toString()),
        storage: {
            owner: await Tezos.signer.publicKeyHash(),
            totalSupply: "100",
            ledger: {
                [await Tezos.signer.publicKeyHash()]: {
                    balance: "100",
                    allowances: {}
                },
            },
        },
        balance: 0,
    })
}).then((op) => {
    return op.contract()
}).then((contract) => {
    const detail = {
        address: contract.address,
        network: "https://rpcalpha.tzbeta.net"
    }

    fs.writeFileSync('./deployed/Token.json', JSON.stringify(detail))
    fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
    console.log('Deployed at:', contract.address)
}).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Receiver.json").toString()),
        storage: 0,
        balance: 0,
    })
}).then((op) => {
    return op.contract()
}).then((contract) => {
    const detail = {
        address: contract.address,
        network: "https://rpcalpha.tzbeta.net"
    }
    fs.writeFileSync('./deployed/Receiver.json', JSON.stringify(detail))
    fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
    console.log('Deployed at:', contract.address)
    receiver = contract.address;
}).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Proxy.json").toString()),
        storage: receiver,
        balance: 0,
    })
}).then((op) => {
    return op.contract()
}).then((contract) => {
    const detail = {
        address: contract.address,
        network: "https://rpcalpha.tzbeta.net"
    }
    fs.writeFileSync('./deployed/Proxy.json', JSON.stringify(detail))
    fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
    console.log('Deployed at:', contract.address)
})
.catch(err => {
    console.log(err)
})