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

Run tests:

```
node tests/tests.js
```
