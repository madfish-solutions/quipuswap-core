# Description

This project is intended to provide an easy and efficient way to exchange tokens and XTZ on Tezos blockchain in a wide number of directions. Using smart contracts listed in this repo users can add their tokens to exchange, provide liquidity, and potentially make a profit in a fully decentralized way.

The current implementation supports [FA1.2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) and [FA2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/tzip-12.md).

# Architecture

![Architecture](Architecture.png)

The solution consists of 3 types of contracts:

1. `Factory` - singleton used to deploy new exchange pair;
2. `Dex` - contract for TokenX-XTZ pair exchanges;
3. `Token` - FA token implementation.
4. `MetadataStorage` - contract to store and upgrade the shares token metadata.

# Project structure

```
.
├──  contracts/ # contracts
|──────── main/ # the contracts to be compiled
|──────── partial/ # the code parts imported by main contracts
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

1. Chose configure the version - `FA12` or `FA2` - by setting `npm_package_config_standard` in package.json and run:

```
yarn run migrate-delphinet
```

For other networks:

```
yarn run migrate # development
yarn run migrate-carthagenet # carthagenet
```

# Usage

Contracts are processed in the following stages:

1. Compilation
2. Deployment
3. Configuration
4. Interactions on-chain

As the Quipuswap supports 2 token standards that vary only in the token interface implementation and the intercontract communication between Dex and external tokens, the shared code base is used. There for to work with the spesific standard the version - `FA12` or `FA2` - should be configured by setting `npm_package_config_standard` in package.json

## Compilation

To compile the contracts run:

```
yarn run compile
```

Artifacts are stored in the `build/contracts` directory.

## Deployment

For deployment step the following command should be used:

```
yarn run migrate
```

Addresses of deployed contracts are displayed in terminal. At this stage, new MetadataStorage, Factory are originated. Aditionaly, for testnets two new pairs are deployed.

For other networks:

```
yarn run migrate-delphinet
yarn run migrate-carthagenet
```

# Entrypoints

The Ligo interfaces of the contracts can be found in `contracts/partials/I__CONTRACT_NAME__.ligo`

## Factory

Factory contains the code template for the `Dex` Token-XTZ pair contracts, deploys them and keeps the list of deployed pairs. The functions for `Dex` are stored in `Factory` contract but because of gas and operation limits their code cannot be stored in Factory contract during the origination: they are added separately one by one.

New exchange pairs are registered and deployed via `LaunchExchange`. The only difference between factory standards is the token identifier type, for F1.2 it is the token address and for FA2 it is the address the token id:

```
#if FA2_STANDARD_ENABLED
type token_identifier is (address * nat)
#else
type token_identifier is address
#endif
```

The contract has the following entrypoints:

```
type launch_exchange_params is record [
  token          : token_identifier;
  token_amount   : nat;
]

type set_token_function_params is record [
  func    : token_func;
  index   : nat;
]
type set_dex_function_params is record [
  func    : dex_func;
  index   : nat;
]

type exchange_action is
| LaunchExchange        of launch_exchange_params
| SetDexFunction        of set_dex_function_params
| SetTokenFunction      of set_token_function_params
```

### SetDexFunction

Sets the dex specific function. Is used before the whole system is launched.

`index` : the key in functions map;

`func` : function code.

Each `index` is designed for a specific `func` which functionality is described below.

### SetTokenFunction

Sets the FA1.2 function. Is used before the whole system is launched.

`index` : the key in functions map;

`func` : function code.

Each `index` is designed for a specific `func` which functionality is described below.

### LaunchExchange

Deploys a new empty `Dex` for `token`, stores the address of the new contract, and puts initial liquidity; has to be called with XTZ amount that will be used as initial liquidity.

`token` : address(address and token id for FA2) of the paired token;

`token_amount` : amount of tokens that will be withdrawn from the user account and used as initial liquidity.

`tez_amount`(not an argument) : the XTZ for initial liquidity should be sent along with the launch transaction.

## Dex

`Dex` fully implements FA1.2/FA2 token interface. For more details check the this [spec](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) and this [spec](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/tzip-12.md). And the extends it with other exchange-related methods.

The contract has the following entrypoints common for both standards:

```

type tez_to_token_payment_params is record [
  amount    : nat;
  receiver  : address;
]

type token_to_tez_payment_params is record [
  amount       : nat;
  min_out      : nat;
  receiver     : address;
]

type divest_liquidity_params is record [
  min_tez      : nat;
  min_tokens   : nat;
  shares       : nat;
]

type vote_params is record [
  candidate   : key_hash;
  value       : nat;
  voter       : address;
]

type veto_params is record [
  value       : nat;
  voter       : address;
]

type dex_action is
| InitializeExchange      of (nat)
| TezToTokenPayment       of tez_to_token_payment_params
| TokenToTezPayment       of token_to_tez_payment_params
| InvestLiquidity         of (nat)
| DivestLiquidity         of divest_liquidity_params
| Vote                    of vote_params
| Veto                    of veto_params
| WithdrawProfit          of (address)

type default_params is unit
type use_params is (nat * dex_action)
```

For FA1.2 standard compatibility the following entrypoints are implemented:

```
type transfer_params is michelson_pair(address, "from", michelson_pair(address, "to", nat, "value"), "")
type approve_params is michelson_pair(address, "spender", nat, "value")
type balance_params is michelson_pair(address, "owner", contract(nat), "")
type allowance_params is michelson_pair(michelson_pair(address, "owner", address, "spender"), "", contract(nat), "")
type total_supply_params is (unit * contract(nat))

type token_action is
| ITransfer             of transfer_params
| IApprove              of approve_params
| IGetBalance           of balance_params
| IGetAllowance         of allowance_params
| IGetTotalSupply       of total_supply_params

type full_action is
| Use                   of use_params
| Default               of default_params
| Transfer              of transfer_params
| Approve               of approve_params
| GetBalance            of balance_params
| GetAllowance          of allowance_params
| GetTotalSupply        of total_supply_params
```

For FA2 standard compatibility the following entrypoints are implemented:

```
type transfer_params is list (transfer_param)
type token_metadata_registry_params is contract (address)
type update_operator_params is list (update_operator_param)

type token_action is
| ITransfer                of transfer_params
| IBalance_of              of balance_params
| IToken_metadata_registry of token_metadata_registry_params
| IUpdate_operators        of update_operator_params

type full_action is
| Use                     of use_params
| Default                 of default_params
| Transfer                of transfer_params
| Balance_of              of balance_params
| Token_metadata_registry of token_metadata_registry_params
| Update_operators        of update_operator_params
```

### Default (index 8)

Used to collect rewards from bakers, donations or misguided payments without specified entrypoint.

### Use

Executes the exchange-related which code is stored in map of lamdas and thus the `index` param is needed.

Actions have the following parameters (index in the list matches the index in `lambdas`):

#### InitializeExchange (index 0)

Sets initial liquidity, XTZ must be sent.

`amount` : the token amount for initial liquidity;

`tez_amount`(not an argument) : the XTZ for initial liquidity should be send along with the launch transaction.

#### TezToTokenPayment (index 1)

Exchanges XTZ to tokens and sends them to `receiver`; operation is reverted if the amount of exchanged tokens is less than `amount`.

`amount` : min amount of tokens received to accept exchange;

`receiver` : tokens received;

`tez_amount`(not an argument) : the XTZ to be exchanged.

#### TokenToTezPayment (index 2)

Exchanges `amount` tokens to XTZ and sends them to `receiver`; operation is reverted if the amount of exchanged XTZ is less than `min_out`.

`amount` : amount of tokens to be exchanged;

`min_out` : min amount of XTZ received to accept exchange;

`receiver` : tokens received;

#### WithdrawProfit (index 3)

Withdraws delegation reward of the sender to `receiver` address.

`receiver` : XTZ received;

#### InvestLiquidity (index 4)

Mints `min_shares` by investing tokens and XTZ; the corresponding amount of XTZ has to be sent via transaction and max amount of tokens to be spent should be approved for `Dex`.

`min_shares` : the minimal shares amount to be minted;

`tez_amount`(not an argument) : the XTZ to be provided as liquidity.

#### DivestLiquidity (index 5)

Burns `shares` and sends tokens and XTZ to the owner; operation is reverted if the amount of divested tokens is smaller than `min_tokens` or the amount of divested XTZ is smaller than `min_tez`.

`shares` : amount of shares to be burnt;

`min_tez` : min amount of XTZ received to accept the divestment;

`min_tokens` : min amount of tokens received to accept the divestment;

#### Vote (index 6)

Votes for `candidate` with shares of `voter`.

`candidate` : the chosen baker;

`value` : amount of shares that are used to vote;

`voter` : the account from which the voting is done.

#### Veto (index 7)

Votes against current delegate with `value` shares of `voter`; the `value` is frozen and can't be transferred or used for another voting.

`value` : amount of shares that are used to vote against the chosen baker;

`voter` : the account from which the veto voting is done.

## Token

Implements [FA1.2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md) or [FA2](https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/tzip-12.md) token interface.

## MetadataStorage

Stores the metadata for Dex as it can't be placed inside the `Dex` contract because of operation size limits under the current protocol rules.

The metadata can be updated by authorities to follow the unstable metadata standards.

```
type update_owner_type is record [
    owner : address;
    add : bool;
]
type metadata_type is map (string, bytes)

type storage is record [
    metadata : metadata_type;
    owners : set(address);
]

(* Valid entry points *)
type storage_action is
| Update_owners of update_owner_type
| Update_storage of metadata_type
| Get_metadata of contract (metadata_type)
```

# Testing
If you'd like to run tests on the local environment, you might want to run `ganache-cli` for Tezos using the following command:
```
yarn start-sandbox
```

Truffle framework is used for testing. Run:
```
yarn test
```

NOTE: if you want to use a different network, configure `truffle-config.js`. If you need to use a different standard, configure `$npm_package_config_standard` in `package.json`
