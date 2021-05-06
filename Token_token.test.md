# Test cases

## Test Item: InitializeExchange Entrypoint

### General Requirements:

1. Initialization is only possible during deployment or if there is no shares.
2. The assets amount cannot be zero during initialization.
3. The user receives the amount of shares equal to provided XTZ.
4. Each token can have the only pair.
5. Info about previous rewards (if any) should be reset.
6. The tokens should be withdrawn from user.

**Scope**: Test various ways to initialize the contract.

**Action**: Invoke the InitializeExchange entrypoint.

**Test Notes and Preconditions**: Ensure all the initialize approaches work.

**Verification Steps**: Verify the exchange is initialized and the initial state is correct.

**Scenario 1**: Test initialize during the deployment when

- [x] the pair doesn't exist
- [x] the amount of token A is zero
- [x] the amount of token B is zero
- [x] the pair exists

**Scenario 2**: Test initialize after liquidity withdrawn when

- [x] liquidity is zero
- [x] liquidity isn't zero
- [x] the amount of token A is zero
- [x] the amount of token B is zero

## Test Item: InvestLiquidity Entrypoint

### General Requirements:

1. Investment is only possible after initialization.
2. At least 1 share should be purchased.
3. Minimal shares are specified by the user.
4. The rewards for the previous period if any should be distributed.
5. The rewards to the user if any should be distributed.
6. The tokens should be withdrawn from user.
7. Shares are calculated as :

```
shares_purchased = xtz_amount * total_supply / tez_pool
tokens_amount = shares_purchased * token_pool / total_supply
```

**Scope**: Test if the investment is allowed.

**Action**: Invoke the InvestLiquidity entrypoint.

**Test Notes and Preconditions**: Ensure the investment is only possible after initialization.

**Verification Steps**: Verify the investment fails if the pool isn't launched.

**Scenario 1**: Test the investment

- [ ] without provided liquidity
- [ ] with provided liquidity

**Scope**: Test various min shared.

**Action**: Invoke the InvestLiquidity entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the investment fails if the min shares aren't in the range.

**Scenario 1**: Test the investment with minimal shares of

- [ ] 0
- [ ] 1
- [ ] enough
- [ ] exact
- [ ] too many

**Scenario 2**: Test purchased shares

- [ ] 0
- [ ] > 0

## Test Item: DivestLiquidity Entrypoint

### General Requirements:

1. Divestment is only possible after initialization.
2. At least 1 share should be burnt.
3. Minimal shares are specified by the user.
4. Burnt shares can't be smaller than the user's balance.
5. The rewards for the previous period if any should be distributed.
6. The rewards to the user if any should be distributed.
7. The tokens should be sent to user.
8. Amounts are calculated as :

```
tez_divested = tez_pool * burnt_shares / total_supply
tokens_divested = token_pool * burnt_shares / total_supply
```

**Scope**: Test if the divestment is allowed.

**Action**: Invoke the DivestLiquidity entrypoint.

**Test Notes and Preconditions**: Ensure the divestment is only possible after initialization.

**Verification Steps**: Verify the divestment fails if the pool isn't launched.

**Scenario 1**: Test the divestment

- [ ] without provided liquidity
- [ ] with provided liquidity

**Scope**: Test various burnt shared.

**Action**: Invoke the DivestLiquidity entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the divestment fails if the the burnt shares aren't in the range.

**Scenario 1**: Test the divestment with burnt shares of

- [ ] 0
- [ ] 1
- [ ] enough
- [ ] exact
- [ ] too many

**Scenario 2**: Test calculated received amount

- [ ] Received tez are zero
- [ ] Reseived tokens are zero

**Scenario 3**: Test expected amount when

- [ ] Expected tez are smaller
- [ ] Expected tokens are smaller
- [ ] Expected tez are exact
- [ ] Expected tokens are exact
- [ ] Expected tez are higher
- [ ] Expected tokens are higher
- [ ] Expected tez are 0
- [ ] Expected tokens are 0

## Test Item: SetXFunctions Entrypoint

### General Requirements:

1. The function can be set only once.
2. Only functions with index between 0 and 8 can be set as exchange functions.
3. Only functions with index between 0 and 4 can be set as token functions.

**Scope**: Test the all functions can be added.

**Action**: Invoke the SetXFunctions entrypoint.

**Test Notes and Preconditions**: Create new empty factory.

**Verification Steps**: Verify the function can be set only once.

**Scenario 1**: Test adding of all

- [ ] exchange fuctions
- [ ] token functions

**Scope**: Test the function replacement.

**Action**: Invoke the SetXFunctions entrypoint.

**Test Notes and Preconditions**: Create new empty factory.

**Verification Steps**: Verify the function can be set only once.

**Scenario 1**: Test the replacement of

- [ ] exchange fuction
- [ ] token function

**Scope**: Test the function count.

**Action**: Invoke the SetXFunctions entrypoint.

**Test Notes and Preconditions**: Create new empty factory.

**Verification Steps**: Verify only 9 exchange and 4 token functions can be set.

**Scenario 1**: Test the function setting

- [ ] of 5th token function
- [ ] of 9th token function

## Test Item: TokenAToTokenB Entrypoint

### General Requirements:

1. Amount of XTZ to swap should be non-zero and received tokens cann't be bigger than 1/3 of reserves.
2. Amount of received tokens should be non-zero and received XTZ cann't be bigger than 1/3 of reserves.
3. Desirable minimal received amount of tokens should be non-zero.
4. The received amount of tokens can't be smaller then minimal decirable amount.
5. All bought tokens should be sent to user.
6. Tez and token pool should be updated accordingly.
7. The output amount is calculated as:

```
fee = tez_in * fee_rate
tokens_out = token_pool * (tez_in - fee) / (tez_pool + tez_in - fee)
```

**Scope**: Test different amount of XTZ to be swapped.

**Action**: Invoke the TezToToken entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the amount to be swapped cannot be zero.

**Scenario 1**: Test swap of

- [ ] 0 XTZ
- [ ] 1% of reserves
- [ ] 30% of reserves
- [ ] 100% of reserves
- [ ] 10000% of reserves

**Scope**: Test different minimal desirable output amount.

**Action**: Invoke the TezToToken entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the received amount cannot be zero and is taken into account during the swap, the real output is still equal to the calculated amount.

**Scenario 1**: Test swap of

- [ ] 0 tokens
- [ ] too many tokens
- [ ] smaller amount of tokens
- [ ] exact tokens

## Test Item: TokenBToTokenA Entrypoint

### General Requirements:

1. Amount of tokens to swap should be non-zero and received XTZ cann't be bigger than 1/3 of reserves.
1. Amount of received tokens should be non-zero and received XTZ cann't be bigger than 1/3 of reserves.
1. Desirable minimal received amount of XTZ should be non-zero.
1. The received amount of XTZ can't be smaller then minimal decirable amount.
1. All bought XTZ should be sent to user.
1. Tez and token pool should be updated accordingly.
1. The output amount is calculated as:

```
fee = tez_in * fee_rate
tokens_out = token_pool * (tez_in - fee) / (tez_pool + tez_in - fee)
```

**Scope**: Test different amount of XTZ to be swapped.

**Action**: Invoke the TokenToTez entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the amount to be swapped cannot be zero.

**Scenario 1**: Test swap of

- [ ] 0 tokens
- [ ] 0.01% of reserves
- [ ] 30% of reserves
- [ ] 100% of reserves
- [ ] 10000% of reserves

**Scope**: Test different minimal desirable output amount.

**Action**: Invoke the TokenToTez entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the received amount cannot be zero and is taken into account during the swap, the real output is still equal to the calculated amount.

**Scenario 1**: Test swap of

- [ ] 0 XTZ
- [ ] too many XTZ
- [ ] exact XTZ
