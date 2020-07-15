## Factory

- [x] add function with higher index
- [x] add function with existed index
- [x] add token pair for existed token

## Dex

### InitializeExchange

- [x] is initiated
- [x] is initiated
- [x] amount is 0
- [x] tokenAmount is 0

### TezToTokenPayment

- [x] amount is 0
- [x] tokenAmount is 0
- [x] wrong tokensOut
- [x] receiver is explicit

### TokenToTezPayment

- [x] amount is 0
- [x] tokenAmount is 0
- [x] wrong tezOut
- [x] receiver is explicit

### TokenToTokenPayment

- [x] amount is 0
- [x] tokenAmount is 0
- [x] wrong tezOut
- [x] receiver is explicit
- [x] token to token transfer for unexisted pair

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
