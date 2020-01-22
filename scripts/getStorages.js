const { exec } = require("child_process");
const fs = require("fs");
const { address: dexAddress } = JSON.parse(fs.readFileSync("./deployed/Dex.json").toString());
const { address: tokenAddress } = JSON.parse(fs.readFileSync("./deployed/Token.json").toString());

exec(`node ./scripts/cli.js storage "${dexAddress}"`, (error, stdout, stderr) => console.log("DEX: " + stdout));
exec(`node ./scripts/cli.js storage "${tokenAddress}"`, (error, stdout, stderr) => console.log("Token: " + stdout)); 
