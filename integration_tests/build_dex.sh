#!/bin/sh

docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.15.0 compile-contract $PWD/contracts/main/TTDex.ligo main > integration_tests/TTDex.tz
docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.15.0  compile-contract $PWD/integration_tests/MockTTDex.ligo main > integration_tests/MockTTDex.tz
