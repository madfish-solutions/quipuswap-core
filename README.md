# Description

This project is intended to provide an easy and efficient way to exchange tokens and XTZ on Tezos blockchain in a wide number of directions. Using smart contracts listed in this repo users can add their tokens to exchange, invest liquidity, and potentially make a profit in a fully decentralized way.

The current implementation supports [FA1.2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) and [FA2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-12.md).

# Architecture

![Architecture](Architecture.png)

The solution consists of 3 types of contracts:

1. `Factory` - singleton used to deploy new exchange pair;
2. `Dex` - contract for TokenX-XTZ pair exchanges;
3. `Token` - FA token implementation.

# Project structure

```
.
├──  contracts/ # contract sources for FA1.2 compatible version
├──  testTs/ # test cases
├──  storage/ # initial storage for contract origination
├──  scripts/ # cli for dex/factory actions
├──  README.md # current file
├──  .gitignore
├──  package.json
└──  Architecture.png
```

# Prerequisites

- Installed NodeJS (tested with NodeJS v12+)
- Installed Truffle:

```
npm install -g truffle@tezos

```

- Installed ganache-cli:

```
npm install -g ganache-cli@tezos

```

- Installed Ligo:

```
curl https://gitlab.com/ligolang/ligo/raw/dev/scripts/installer.sh | bash -s "next"
```

- Installed node modules:

```
cd quipuswap-core && npm i
```

- Configure `truffle-config.js` if [needed](https://www.trufflesuite.com/docs/tezos/truffle/reference/configuring-tezos-projects).

# Usage

Contracts are processed in the following stages:

1. Compilation
2. Deployment
3. Configuration
4. Interactions on-chain

## Compilation

To compile the contracts run:

```
npm run compile
```

Artifacts are stored in the `build/contracts` directory.

## Deployment

For deployment step the following command should be used:

```
npm run migrate
```

Addresses of deployed contracts are displayed in terminal. At this stage, new Factory, two new pairs are originated.

# Entrypoints

The Ligo interfaces of the contracts can be found in `contracts/partials`

## Factory

Factory contains the code template for the `Dex` Token-XTZ pair contracts, deploys them and keeps the list of deployed pairs. The functions for `Dex` are stored in `Factory` contract but because of gas and operation limits their code cannot be stored in Factory contract during the origination: they are added separately one by one.

New exchange pairs are registred and deployed via `LaunchExchange`.

The contract has the following entrypoints:

```
type launchExchangeParams is record [
  token         : address;
  tokenAmount   : nat;
]

type setTokenFunctionParams is record [
  func    : tokenFunc;
  index   : nat;
]

type setDexFunctionParams is record [
  func    : dexFunc;
  index   : nat;
]

type exchangeAction is
| LaunchExchange of launchExchangeParams
| SetDexFunction of setDexFunctionParams
| SetTokenFunction of setTokenFunctionParams
```

### SetDexFunction

Sets the dex specific function. Is used before the whole system is launched.

`index` : the key in functions map;

`func` : function code.

Each `index` is designed for specific `func` which functionality are decribed below.

### SetTokenFunction

Sets the FA1.2 function. Is used before the whole system is launched.

`index` : the key in functions map;

`func` : function code.

Each `index` is designed for specific `func` which functionality are decribed below.

### LaunchExchange

Deploys a new empty `Dex` for `token`, stores the address of the new contract and put initial liquidity; has to be called with tezos amount that will be used as intial liquidity.

`token` : address of the paired token;

`tokenAmount` : amount of tokens that will be withdrawn from user account and used as initial liquidity.

`tezAmount`(not an argument) : the XTZ for initial liquidity should be send along with the launch transaction.

## Dex

`Dex` fully implements FA1.2 token interface. For more details check the [spec](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md). And the extends it with other exchnge-related methods.

The contract has the following entrypoints:

```

type tezToTokenPaymentParams is record [
  amount    : nat;
  receiver  : address;
]

type tokenToTezPaymentParams is record [
  amount      : nat;
  minOut      : nat;
  receiver    : address;
]

type divestLiquidityParams is record [
  minTez      : nat;
  minTokens   : nat;
  shares      : nat;
]

type voteParams is record [
  candidate   : key_hash;
  value       : nat;
  voter       : address;
]

type vetoParams is record [
  value       : nat;
  voter       : address;
]

type dexAction is
| InitializeExchange of (nat)
| TezToTokenPayment of tezToTokenPaymentParams
| TokenToTezPayment of tokenToTezPaymentParams
| InvestLiquidity of (nat)
| DivestLiquidity of divestLiquidityParams
| Vote of voteParams
| Veto of vetoParams
| WithdrawProfit of (address)

type defaultParams is unit
type useParams is (nat * dexAction)
type transferParams is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type approveParams is michelson_pair(address, "spender", nat, "value")
type balanceParams is michelson_pair(address, "owner", contract(nat), "")
type allowanceParams is michelson_pair(michelson_pair(address, "owner", address, "spender"), "", contract(nat), "")
type totalSupplyParams is (unit * contract(nat))

type tokenAction is
| ITransfer of transferParams
| IApprove of approveParams
| IGetBalance of balanceParams
| IGetAllowance of allowanceParams
| IGetTotalSupply of totalSupplyParams

type fullAction is
| Use of useParams
| Default of defaultParams
| Transfer of transferParams
| Approve of approveParams
| GetBalance of balanceParams
| GetAllowance of allowanceParams
| GetTotalSupply of totalSupplyParams
```

### Default

Used to collect rewards from bakers, donations or misguided payments without specified entrypoint.

### Use

Executes the exchange-related which code is stored in map of lamdas and thus the `index` param is needed.

Actions have the following parameters (index in the list matches the index in `lambdas`):

0. `initializeExchange(tokenAmount: nat)`: sets initial liquidity, XTZ must be sent.
1. `tezToToken(minTokensOut: nat, receiver: address)`: exchanges XTZ to tokens and sends them to `receiver`; operation is reverted if the amount of exchanged tokens is less than `minTokensOut`.
2. `tokenToTez(tokensIn: nat, minTezOut: nat, receiver: address)`: exchanges `tokensIn` tokens to XTZ and sends them to `receiver`; operation is reverted if the amount of exchanged XTZ is less than `minTezOut`.
3. `withdrawProfit(receiver: address)`: withdraws delegation reward of the sender to `receiver` address.
4. `investLiquidity(minShares: nat)`: allows to own `minShares` by investing tokens and XTZ; the corresponding amount of XTZ has to be sent via transaction and amount of tokens has to be approved to be spent by `Dex`.
5. `divestLiquidity(minTezDivested: nat, minTokensDivested: nat, sharesBurned: nat)`: divests `sharesBurned` and sends tokens and XTZ to the owner; operation is reverted if the amount of divested tokens is smaller than `minTokensDivested` or the amount of divested XTZ is smaller than `minTezDivested`.
6. `setVotesDelegation(deputy: address, isAllowed: bool)`: allows or prohibits `deputy` to vote with sender shares.
7. `vote(candidate: key_hash, voter: address)`: votes for `candidate` with shares of `voter`.
8. `veto(voter: address)`: votes against current delegate with shares of `voter`.
9. `default()`: default entrypoint to receive payments; received XTZ is distributed between liquidity providers at the end of the delegation cycle.

## Token

Implements [FA1.2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) token interface.

# Testing

Truffle framework is used for testing. Run:

```
npm test
```

NOTE: if you want to use a different network, configure `$npm_package_config_network` in `package.json`
