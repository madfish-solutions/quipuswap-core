const { Tezos } = require("@taquito/taquito");
const { exec } = require("child_process");
const fs = require("fs");
const { email, password, mnemonic, secret } = JSON.parse(
  fs.readFileSync("./faucet.json").toString()
);
var Token;
var Factory;
Tezos.setProvider({ rpc: "https://api.tez.ie/rpc/babylonnet" });

exec("mkdir -p deployed");
Tezos.importKey(email, password, mnemonic.join(" "), secret)
  .then(async () => {
    return Tezos.contract.originate({
      code: JSON.parse(fs.readFileSync("./build/Token.json").toString()),
      storage: {
        owner: await Tezos.signer.publicKeyHash(),
        totalSupply: "10000000000",
        ledger: {
          [await Tezos.signer.publicKeyHash()]: {
            balance: "10000000",
            allowances: {}
          }
        }
      },
      balance: 0
    });
  })
  .then(op => {
    return op.contract();
  })
  .then(contract => {
    const detail = {
      address: contract.address,
      network: "https://api.tez.ie/rpc/babylonnet"
    };

    fs.writeFileSync("./deployed/Token.json", JSON.stringify(detail));
    fs.writeFileSync(
      `./deployed/${contract.address}.json`,
      JSON.stringify(detail)
    );
    console.log("Deployed at:", contract.address);
    Token = contract.address;
  })
  .then(async () => {
    return Tezos.contract.originate({
      code: JSON.parse(fs.readFileSync("./build/Factory.json").toString()),
      storage: {
        tokenList: [],
        tokenToExchange: {},
        exchangeToToken: {}
      },
      balance: 0
    });
  })
  .then(op => {
    return op.contract();
  })
  .then(contract => {
    const detail = {
      address: contract.address,
      network: "https://api.tez.ie/rpc/babylonnet"
    };
    fs.writeFileSync("./deployed/Factory.json", JSON.stringify(detail));
    fs.writeFileSync(
      `./deployed/${contract.address}.json`,
      JSON.stringify(detail)
    );
    console.log("Deployed at:", contract.address);
    Factory = contract.address;
  })
  .then(async () => {
    return Tezos.contract.originate({
      code: JSON.parse(fs.readFileSync("./build/Dex.json").toString()),
      storage: {
        feeRate: "500",
        tezPool: "0",
        tokenPool: "0",
        invariant: "0",
        totalShares: "0",
        tokenAddress: Token,
        factoryAddress: Factory,
        shares: {},
        candidates: {},
        votes: {},
        delegated: "tz3WXYtyDUNL91qfiCJtVUX746QpNv5i5ve5"
      },
      balance: 0
    });
  })
  .then(op => {
    return op.contract();
  })
  .then(contract => {
    const detail = {
      address: contract.address,
      network: "https://api.tez.ie/rpc/babylonnet"
    };
    fs.writeFileSync("./deployed/Dex.json", JSON.stringify(detail));
    fs.writeFileSync(
      `./deployed/${contract.address}.json`,
      JSON.stringify(detail)
    );
    console.log("Deployed at:", contract.address);
  })
  .catch(err => {
    console.log(err);
  });
