const { exec } = require("child_process");
const fs = require("fs");
const { address: dexAddress } = JSON.parse(fs.readFileSync("./deployed/Dex.json").toString());
const { address: tokenAddress } = JSON.parse(fs.readFileSync("./deployed/Token.json").toString());
const { address: factoryAddress } = JSON.parse(fs.readFileSync("./deployed/Factory.json").toString());
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exec(`ligo compile-parameter ./contracts/Factory.ligo main -s pascaligo "LaunchExchange((\\"${tokenAddress}\\": address), (\\"${dexAddress}\\": address))"`, async (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  
  exec(`./babylonnet.sh client -A rpcalpha.tzbeta.net -P 443 -S  transfer 0 from alice to "${factoryAddress}" --arg "${stdout.trim().replace(/\"/g, "\\\"")}" --burn-cap 0.5`, async (error, stdout, stderr) => {
    console.log(stdout);
    sleep(50000).then( () => {
      exec(`node ./scripts/cli.js storage "${factoryAddress}"`, (error, stdout, stderr) => console.log("FACTORY: " + stdout));
    });
  })
});

