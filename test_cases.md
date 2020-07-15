## Factory

- [x] add function with higher index
- [x] add function with existed index
- [x] add token pair for existed token

## Dex

### InitializeExchange

- [ ] is initiated
- [ ] is initiated
- [ ] amount is 0
- [ ] tokenAmount is 0

### TezToTokenPayment

- [ ] amount is 0
- [ ] tokenAmount is 0
- [ ] wrong tokensOut
- [ ] receiver is explicit

### TokenToTezPayment

- [ ] amount is 0
- [ ] tokenAmount is 0
- [ ] wrong tezOut
- [ ] receiver is explicit

### TokenToTokenPayment

- [ ] amount is 0
- [ ] tokenAmount is 0
- [ ] wrong tezOut
- [ ] receiver is explicit
- [ ] token to token transfer for unexisted pair

### InvestLiquidity

- [ ] amount is 0
- [ ] tokenAmount is 0
- [ ] wrong minShares
- [ ] receiver is explicit
- [ ] if vetted candidate

### DivestLiquidity

- [ ] divestedShares is 0
- [ ] amountOut is too low
- [ ] tokensOut is too low

### SetVotesDelegation

- [ ] set to Self
- [ ] set more than 5

### Vote

- [ ] not voter/not allowed
- [ ] vote for vetted
- [ ] vote without shares

### Veto

- [ ] old shares
- [ ] veto for None
- [ ] veto without permission

### WithdrawProfit

- [ ] no profit to withdraw

## General

- [ ] try spam by 5 accounts
