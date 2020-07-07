This project is intended to provide an easy and efficient way to exchange tokens,
Tez to tokens and vice versa. Using smart contracts users can add own tokens
to exchange, invest liquidity and make profit in fully decentralized way.

Current implementation supports FA1.2 tokens.

# Architecture

# Prerequirements

- Ligo installed in Docker:

```
docker pull ligolang/ligo:next
```

- node packages:

```
npm i
```

# Usage

Contracts are processed the following stages:

1. Compilation
2. Deployment
3. Configuration
4. Interactions on-chain

## Compilation

To compile the contracts and generate Michelson:

```
docker run -v $PWD:$PWD --rm -i ligolang/ligo:next compile-contract $PWD/contracts/Dex.ligo main > contracts/Dex.tz
node scripts/cli2.js build Factory
node scripts/cli2.js build Token
node scripts/cli2.js build Dex
```

Here we compile `Dex.ligo` to raw Michelson. This code will be deployed during Factories `LaunchExchange` call to add new exchange-pair. And then compile other contracts and store them in json format to deploy with [taquito](https://tezostaquito.io/).

## Factory Deployment

First we need to prepare storage for Factory contract:

```
node scripts/cli2.js compile_storage Factory 'record   storage = record      tokenList = (set[] : set(address));      tokenToExchange = (big_map[] :big_map(address, address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end'
```

Then we should **_manually_** optimize code to avoid **_storage limits issue_**. The simplest way is to strip annotation in `Factory.json`. Only `parameter` and `storage` related anotations shouldn't be removed as they are needed to easy interact with contract and read it storage using Taqito.

Then contracts are deployed to the network (flag -n says that the storage is in Michelson format).

```
node scripts/cli2.js deploy -n Factory
node scripts/cli2.js deploy Token
node scripts/cli2.js deploy Token Token2
```

## Factory Configuration

Because of **_gas limit issue_** it is impossible to put all the functions to the code sections of the contract(and execute it). Instead they are stored in as lambdas in `big_map`. Their code cannot be placed to the storage due to **_storage limits issue_**. Each Dex function is added by separate transaction:

```
node scripts/cli2.js set_settings 0 initializeExchange
node scripts/cli2.js set_settings 1 tezToToken
node scripts/cli2.js set_settings 2 tokenToTez
node scripts/cli2.js set_settings 3 tokenToTokenOut
node scripts/cli2.js set_settings 4 investLiquidity
node scripts/cli2.js set_settings 5 divestLiquidity
node scripts/cli2.js set_settings 6 setVotesDelegation
node scripts/cli2.js set_settings 7 vote
node scripts/cli2.js set_settings 8 veto
node scripts/cli2.js set_settings 9 receiveReward
node scripts/cli2.js set_settings 10 withdrawProfit
```

After this step new token pairs can be added.

## Exchange Pair Deployment

Each token can have no more the one Exchange Pair contract(aka. `Dex`). To add new token `LaunchExchange` of Factory contract is called and new empty `Dex` instance is deployed.
Run:

```
node scripts/cli2.js add_token TOKEN_ADDRESS
```

Then big_map woth functions should be send to `Dex`:

```
node scripts/cli2.js configure_dex TOKEN_ADDRESS
```

Now exchnage can be used.

# Entrypoints

# Testing

Mocha is used for testing and is installed along with other packages.

Launch sandbox network. For instance, using [truffle](https://www.trufflesuite.com/docs/tezos/truffle/quickstart).

Run testing:

```
./node_modules/mocha/bin/mocha
```
