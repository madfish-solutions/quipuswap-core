#!/bin/sh

mkdir integration_tests/compiled
docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.24.0 compile-contract $PWD/contracts/main/Dex.ligo main > integration_tests/compiled/Dex.tz

mkdir integration_tests/compiled/lambdas

mkdir integration_tests/compiled/lambdas/dex
for i in 0,initialize_exchange \
        1,token_to_token_route \
        2,invest_liquidity \
        3,divest_liquidity \
         ; do 

    IDX=${i%,*};
    FUNC=${i#*,};
    echo $IDX-$FUNC;

    docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.24.0 compile-parameter --michelson-format=json $PWD/contracts/main/Dex.ligo main "SetDexFunction(record index = ${IDX}n; func = ${FUNC}; end)" --output  $PWD/integration_tests/compiled/lambdas/dex/${IDX}-${FUNC}.json
done

mkdir integration_tests/compiled/lambdas/token
for i in 0,transfer \
        1,update_operators \
        2,get_balance_of \
         ; do 

    IDX=${i%,*};
    FUNC=${i#*,};
    echo $IDX-$FUNC;

    docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.24.0 compile-parameter --michelson-format=json $PWD/contracts/main/Dex.ligo main "SetTokenFunction(record index = ${IDX}n; func = ${FUNC}; end)" --output  $PWD/integration_tests/compiled/lambdas/token/${IDX}-${FUNC}.json
done