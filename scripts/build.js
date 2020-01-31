const { exec } = require("child_process");
const fs = require("fs");

exec("mkdir -p build");
exec(
  `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract --michelson-format=json $PWD/contracts/Token.ligo main`,
  (err, stdout, stderr) => {
    if (err) throw err;

    fs.writeFileSync("./build/Token.json", stdout);
  }
);

exec(
  `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract --michelson-format=json $PWD/contracts/Dex.ligo main`,
  { maxBuffer: 1024 * 500 },
  (err, stdout, stderr) => {
    if (err) throw err;

    fs.writeFileSync("./build/Dex.json", stdout);
  }
);

exec(
  `docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract --michelson-format=json $PWD/contracts/Factory.ligo main`,
  { maxBuffer: 1024 * 500 },
  (err, stdout, stderr) => {
    if (err) throw err;

    fs.writeFileSync("./build/Factory.json", stdout);
  }
);
