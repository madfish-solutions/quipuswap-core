const { Tezos } = require('@taquito/taquito')
const { exec } = require("child_process");
const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(fs.readFileSync('./faucet.json').toString())
var Token;
Tezos.setProvider({ rpc: "https://rpcalpha.tzbeta.net" })

exec("mkdir -p deployed")
Tezos.importKey(email, password, mnemonic.join(" "), secret).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Token.json").toString()),
        storage: {
            owner: await Tezos.signer.publicKeyHash(),
            totalSupply: "1000000",
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
    Token = contract.address;
}).then(async () => {
    return Tezos.contract.originate({
        code: JSON.parse(fs.readFileSync("./build/Dex.json").toString()),
        storage: {
            feeRate: "500",
            ethPool: "0",
            tokenPool: "0",
            invariant: "0",
            totalShares: "0",
            tokenAddress: Token, // FIX IT
            factoryAddress: Token, // FIX IT
            shares: {}       
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
    fs.writeFileSync('./deployed/Dex.json', JSON.stringify(detail))
    fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
    console.log('Deployed at:', contract.address)
})
// .then(async () => {
//     return Tezos.contract.originate({
//         code: JSON.parse(fs.readFileSync("./build/Proxy.json").toString()),
//         storage: Dex,
//         balance: 0,
//     })
// }).then((op) => {
//     return op.contract()
// }).then((contract) => {
//     const detail = {
//         address: contract.address,
//         network: "https://rpcalpha.tzbeta.net"
//     }
//     fs.writeFileSync('./deployed/Proxy.json', JSON.stringify(detail))
//     fs.writeFileSync(`./deployed/${contract.address}.json`, JSON.stringify(detail))
//     console.log('Deployed at:', contract.address)
// })
.catch(err => {
    console.log(err)
})