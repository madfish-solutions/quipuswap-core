#!/bin/sh

mkdir integration_tests/lambdas

for i in 0,initialize_exchange \
        1,token_to_token_route \
        2,invest_liquidity \
        3,divest_liquidity \
         ; do 

    IDX=${i%,*};
    FUNC=${i#*,};
    echo $IDX-$FUNC;

    docker run -v $PWD:$PWD --rm -i ligolang/ligo:0.15.0 compile-parameter --michelson-format=json $PWD/contracts/main/TTDex.ligo main "SetDexFunction(record index = ${IDX}n; func = ${FUNC}; end)" --output  $PWD/integration_tests/lambdas/${IDX}-${FUNC}.json
done

