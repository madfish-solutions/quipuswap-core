const { execSync } = require("child_process");

module.exports.getLigo = (isDockerizedLigo) => {
  let path = "ligo";
  let ligoVersion = process.env.LIGO_VERSION;
  if (isDockerizedLigo) {
    path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${ligoVersion}`;
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use global version...");
      path = "ligo";
      execSync(`${path}  --help`);
    }
  } else {
    try {
      execSync(`${path}  --help`);
    } catch (err) {
      console.log("Trying to use Dockerized version...");
      path = `docker run -v $PWD:$PWD --rm -i ligolang/ligo:${ligoVersion}`;
      execSync(`${path}  --help`);
    }
  }
  return path;
};
