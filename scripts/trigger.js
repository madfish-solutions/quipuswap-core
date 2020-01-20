const { exec } = require("child_process");
const fs = require("fs");
let amount = 100;
const { address: dexAddress } = JSON.parse(fs.readFileSync("./deployed/Dex.json").toString());
const { address: tokenAddress } = JSON.parse(fs.readFileSync("./deployed/Token.json").toString());

exec(`ligo compile-parameter ./contracts/Token.ligo main -s pascaligo "Approve((\\\"${dexAddress}\\\" : address), ${amount}n)"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`tezos-client -A rpcalpha.tzbeta.net -P 443 -S  transfer 0 from alice to "${tokenAddress}" --arg "${stdout}" --burn-cap 0.5`);
});
exec(`ligo compile-parameter ./contracts/Dex.ligo main -s pascaligo "InitializeExchange(${amount}n)"`, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`tezos-client -A rpcalpha.tzbeta.net -P 443 -S  transfer 0.1 from alice to "${dexAddress}" --arg "${stdout}" --burn-cap 0.5`);
  });  