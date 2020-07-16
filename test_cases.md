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
- [ ] relaunch

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

- [x] amount is 0
- [x] tokenAmount is 0
- [x] low minShares
- [x] high minShares
- [x] total shares higher than tokens
- [x] total shares higher than xtz
- [ ] if vetted candidate

### DivestLiquidity

- [x] divestedShares is 0
- [x] amountOut is too low
- [x] tokensOut is too low
- [x] amountOut is too high
- [x] tokensOut is too high

### SetVotesDelegation

- [x] set to Self
- [x] set more than 5

### Vote

- [x] not voter/not allowed
- [x] vote for vetted
- [x] vote without shares

### Veto

- [ ] old shares
- [ ] veto for None
- [ ] veto without permission

### WithdrawProfit

- [ ] no profit to withdraw

## General

- [ ] try spam by 5 accounts
