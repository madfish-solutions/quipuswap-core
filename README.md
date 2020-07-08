This project is intended to provide an easy and efficient way to exchange tokens,
Tez to tokens and vice versa. Using smart contracts users can add own tokens
to exchange, invest liquidity and make profit in fully decentralized way.

Current implementation supports FA1.2 tokens.

# Architecture

The solution consist of 3 type of contracts:

1. Factory : singleton used to deploy new exchange pair and route Tez during token to token exchanges;
2. Dex : repre
3. Token

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
node scripts/cli2.js build Dex --no-json -o contracts
node scripts/cli2.js build Factory
node scripts/cli2.js build Token
```

Here we compile `Dex.ligo` to raw Michelson. This code will be deployed during Factories `LaunchExchange` call to add new exchange-pair. And then compile other contracts and store them in json format to deploy with [taquito](https://tezostaquito.io/).

Сompiled Factory and Token are stored in `build`.

## Factory & Token Deployment

First we need to prepare storage for Factory contract:

```
node scripts/cli2.js compile_storage Factory 'record   storage = record      tokenList = (set[] : set(address));      tokenToExchange = (big_map[] :big_map(address, address));      lambdas = (big_map[] : big_map(nat, (dexAction * dex_storage * address) -> (list(operation) * dex_storage)));   end;   lambdas =  big_map[0n -> launchExchange]; end'
```

Then contracts are deployed to the network (flag -n says that the storage is in Michelson format) with commands:

```
node scripts/cli2.js deploy -n Factory
node scripts/cli2.js deploy Token
node scripts/cli2.js deploy Token Token2
```

Addresses of deployed contacts sre displayed and stored to `deploy` folder in JSON format.

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
node scripts/cli2.js add_token
node scripts/cli2.js add_token Token2
```

Now exchnage can be used.

# Entrypoints

## Factory

- launchExchange(token: address): deploys new empty `Dex` for `token` and store the address of new contract;
- tokenToExchangeLookup(token: address, receiver: address, minTokenOut: nat) : look for `Dex` address for `token` and call `use(1n,TezToTokenPayment(minTokenOut, receiver))` resending received TRX to exchange.
- configDex(token: address): set lambdas to deployed `Dex` contract.
- setFunction(funcIndex: nat, func : (dexAction, dex_storage, address) -> (list(operation), dex_storage)):

## Dex

- DivestLiquidity of (nat _ nat _ nat)
- SetVotesDelegation of (address \* bool)

- setSettings(funcs: big_map(nat, (dexAction, dex_storage, address) -> (list(operation), dex_storage))) : set `funcs` that are sent from Factory to `lambdas`; these functions can be executed with `use` entrypoint.
- default() : default entrypoint to receive payments; received XTZ are destributed between liquidity providers in the end of the delegation circle.
- use(funcIndex: nat, action: dexAction) : executes the function with index `funcIndex` from `lambdas` with parameters `action`.

Actions have the following parameters (index in the list matches the index in `lambdas`):

0. initializeExchange(tokenAmount: nat)
1. tezToToken(minTokensOut: nat, receiver: address)
2. tokenToTez(tokensIn: nat, minTezOut: nat, receiver: address)
3. tokenToTokenOut(tokensIn: nat, minTokensOut: nat, token: address, receiver: address)
4. investLiquidity(minShares: nat)
5. divestLiquidity(minSharesBurned: nat, minTezDivested: nat, minSharesDivested: nat)
6. setVotesDelegation(deputy: address, isAllowed: bool)
7. vote(voter: address)
8. veto(voter: address)
9. default()
10. withdrawProfit(receiver: address)

## Token FA1.2

# Testing

Mocha is used for testing and is installed along with other packages.

Launch sandbox network. For instance, using [truffle](https://www.trufflesuite.com/docs/tezos/truffle/quickstart).

Run testing:

```
./node_modules/mocha/bin/mocha
```
