This project is intended to provide an easy and efficient way to exchange tokens,
Tez to Tokens and vice versa. Using smart contracts users can add own tokens
to exchange, invest liquidity and make profit in fully decentralized way.

Current implementation supports FA1.2 tokens.

# How to try it out

The `scripts` directory contains scripts for manual testing of the basic contract functionality.

It uses tezos client and `babylon.sh`, so you should have docker running with all necessary tezos containers.

Scripts require dependencies to be installed before running:

```
npm i
```

You can run a script using the following command:

```
node scripts/<<SCRIPT_NAME>>.js
```

We are intended to replace this "wild" testing approach by tests automatic using Taquito soon.

## Scripts description

`build.js`: is used to build contracts; the result is saved to `build` directory.

`deploy.js`: is used to deploy contracts; the result `.json` files with addresses and networks are saved to `deployed` directory.

`getStorages.js`: is used to show deployed `Dex` and `Token` storages.

`initiateDex.js`: is used to send first tokens and tezoses to set initial liquidity.

`investLiquidity.js`: is used to send tokens and tezoses to get shares of Dex and effect liquidity.

`divestLiquidity.js`: is used to withdraw tokens and tezoses, burn shares of Dex and effect liquidity.

`launchExchange.js`: is used to add Dex-Token pair to Factory to enable Token-to-Token exchange.

`tezToToken.js`: is used for tezos to token exchange.

`tokenToTez.js`: is used for token to tezos exchange.

`tokenToToken.js`: is used for token to token exchange.
