#!/bin/sh

mkdir -p integration_tests/compiled
docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.27.0 compile-contract $PWD/contracts/main/Dex.ligo main > integration_tests/compiled/Dex.tz

mkdir -p integration_tests/compiled/lambdas

docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.27.0 compile storage $PWD/contracts/main/Dex.ligo  initial_storage --warn false --michelson-format json > integration_tests/compiled/storage.json
