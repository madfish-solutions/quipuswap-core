# Description

This project is intended to provide an easy and efficient way to exchange tokens and XTZ on Tezos blockchain in a wide number of directions. Using smart contracts listed in this repo users can add their tokens to exchange, provide liquidity, and potentially make a profit in a fully decentralized way.

The current implementation supports [FA1.2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) and [FA2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/tzip-12.md).

# Architecture

![Architecture](Architecture.png)

The solution consists of 6 types of contracts:

1. `Factory` - singleton used to deploy new TokenX-XTZ exchange pair;
2. `Dex` - contract for TokenX-XTZ pair exchanges;
3. `TTDex` - contract for TokenX-TokenY pair exchanges;
4. `Token` - FA token implementation.
5. `BakerRegistry` - bakery registrar.
6. `MetadataStorage` - contract to store and upgrade the shares token metadata.

# Project structure

```
.
├──  ci/ # scripts for continues integration
├──  contracts/ # contracts
|──────── main/ # the contracts to be compiled
|──────── partial/ # the code parts imported by main contracts
├──  test/ # test cases
├──  storage/ # initial storage for contract originations
├──  scripts/ # cli for dex/factory actions
├──  test.md # cases covered by tests
├──  README.md # current file
├──  .env
├──  .gitignore
├──  package.json
└──  Architecture.png
```

# Prerequisites

- Installed NodeJS (tested with NodeJS v12+)

- Installed Yarn (NPM isn't working properly with `ganache-cli@6.11.0-tezos.0`)

- Installed Ligo:

```
curl https://gitlab.com/ligolang/ligo/raw/dev/scripts/installer.sh | bash -s "next"
```

- Installed node modules:

```
cd quipuswap-core && yarn
```

- Configure `truffle-config.js` if [needed](https://www.trufflesuite.com/docs/tezos/truffle/reference/configuring-tezos-projects).

# Quick Start

To compile and deploy contracts to Delphinet

1. Chose configure the version - `FA12` or `FA2` - by setting `EXCHANGE_TOKEN_STANDARD` in `.env` and run:

```
yarn migrate
```

For other networks:

```
yarn migrate --network NAME
```

# Usage

Contracts are processed in the following stages:

1. Compilation
2. Deployment
3. Configuration
4. Interactions on-chain

As the Quipuswap supports 2 token standards that vary only in the token interface implementation and the inter contract communication between Dex and external tokens, the shared codebase is used. Therefore to work with the specific standard version, you should configure it by setting `EXCHANGE_TOKEN_STANDARD` in `.env` to either `FA12` or `FA2`.

## Compilation

To compile the contracts run:

```
yarn compile
```

Artifacts are stored in the `build/contracts` directory.

## Deployment

For deployment step the following command should be used:

```
yarn migrate
```

Addresses of deployed contracts are displayed in terminal. At this stage, new MetadataStorage, Factory are originated. Aditionaly, for testnets two new pairs are deployed.

# Testing

If you'd like to run tests on the local environment, you might want to run `ganache-cli` for Tezos using the following command:

```
yarn start-sandbox
```

Truffle framework is used for testing. Run:

```
yarn test
```

NOTE: if you want to use a different network, configure `truffle-config.js`. If you need to use a different standard, configure `$EXCHANGE_TOKEN_STANDARD` in `.env`
