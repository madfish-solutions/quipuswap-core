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
- [x] the amount of XTZ is zero
- [x] the amount of token is zero
- [x] the token isn't approved
- [x] the pair exists

**Scenario 2**: Test initialize after liquidity withdrawn when

- [x] liquidity is zero
- [x] liquidity isn't zero
- [x] the amount of XTZ is zero
- [x] the amount of token is zero
- [x] the token isn't approved

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

- [x] without provided liquidity
- [x] with provided liquidity

**Scope**: Test various min shared.

**Action**: Invoke the InvestLiquidity entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the investment fails if the min shares aren't in the range.

**Scenario 1**: Test the investment with minimal shares of

- [x] 0
- [x] 1
- [x] enough
- [x] exact
- [x] too many

**Scenario 2**: Test purchased shares

- [x] 0
- [x] > 0

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

- [x] without provided liquidity
- [x] with provided liquidity

**Scope**: Test various burnt shared.

**Action**: Invoke the DivestLiquidity entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the divestment fails if the the burnt shares aren't in the range.

**Scenario 1**: Test the divestment with burnt shares of

- [x] 0
- [x] 1
- [x] enough
- [x] exact
- [x] too many

**Scenario 2**: Test calculated received amount

- [x] Received tez are zero
- [x] Reseived tokens are zero

**Scenario 3**: Test expected amount when

- [x] Expected tez are smaller
- [x] Expected tokens are smaller
- [x] Expected tez are exact
- [x] Expected tokens are exact
- [x] Expected tez are higher
- [x] Expected tokens are higher
- [x] Expected tez are 0
- [x] Expected tokens are 0

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

- [x] exchange fuctions
- [x] token functions

**Scope**: Test the function replacement.

**Action**: Invoke the SetXFunctions entrypoint.

**Test Notes and Preconditions**: Create new empty factory.

**Verification Steps**: Verify the function can be set only once.

**Scenario 1**: Test the replacement of

- [x] exchange fuction
- [x] token function

**Scope**: Test the function count.

**Action**: Invoke the SetXFunctions entrypoint.

**Test Notes and Preconditions**: Create new empty factory.

**Verification Steps**: Verify only 9 exchange and 4 token functions can be set.

**Scenario 1**: Test the function setting

- [x] of 5th token function
- [x] of 9th token function

## Test Item: TezToToken Entrypoint

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

- [x] 0 XTZ
- [x] 1% of reserves
- [x] 30% of reserves
- [x] 100% of reserves
- [x] 10000% of reserves

**Scope**: Test different minimal desirable output amount.

**Action**: Invoke the TezToToken entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the received amount cannot be zero and is taken into account during the swap, the real output is still equal to the calculated amount.

**Scenario 1**: Test swap of

- [x] 0 tokens
- [x] too many tokens
- [x] smaller amount of tokens
- [x] exact tokens

## Test Item: TokenToTez Entrypoint

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

- [x] 0 tokens
- [x] 0.01% of reserves
- [x] 30% of reserves
- [x] 100% of reserves
- [x] 10000% of reserves

**Scope**: Test different minimal desirable output amount.

**Action**: Invoke the TokenToTez entrypoint.

**Test Notes and Preconditions**: Create new pair, provide liquidity.

**Verification Steps**: Ensure the received amount cannot be zero and is taken into account during the swap, the real output is still equal to the calculated amount.

**Scenario 1**: Test swap of

- [x] 0 XTZ
- [x] too many XTZ
- [x] exact XTZ

## Test Item: Token To Token Exchange

### General Requirements:

1. Should be possibel to exchange token to token via batch.

**Scope**: Test correct requied amounts.

**Action**: Invoke the TokenToTez and TezToToken entrypoints.

**Test Notes and Preconditions**: Create 2 new pairs, provide liquidity.

**Verification Steps**: Ensure the received amount is taken into account during the swap, the real output is still equal to the calculated amount.

**Scenario 1**: Test swap of 1000 tokens

## Test Item: Vote Exchange

### General Requirements:

1. Vote is only possible if the user has shares in the pool.
2. The user cannot vote for the banned candidate.
3. The user cannot exceed the share balance (including the amount of voted tokens).
4. The other user can vote instead of shares owner if there are enough allowances.
5. The previous votes should be removed if the user voted before.
6. Total votes, user liquid balance and candidate should be updated.
7. Zero vote should be interpreted as removing any candidate.
8. If the amount of vote for the candidate is higher than the previous, baker is updated.

check:

1. voter balance
2. voter frozen balance
3. voter candidate
4. voter vote
5. candidate votes
6. current delegated
7. current candidate
8. total votes

**Scope**: Test the user's vote power.

**Action**: Invoke the Vote entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the amount of votes can't be higher than the liquid balance.

**Scenario 1**: Test voting with:

- [x] no shares.
- [x] 0 shares with no candidate.
- [x] more than liquid shares.
- [x] enough liquid shares.
- [x] exactly equal to liquid balance.
- [x] enough liquid shares for revoting.
- [x] 0 shares to remove candidate.

**Scope**: Test voting permissions.

**Action**: Invoke the Vote entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before, the user should have shares to vote.

**Verification Steps**: Verify the voting for user can only be done by approved users or user by himself.

**Scenario 1**: Test voting by:

- [x] the user.
- [x] the approved user.
- [x] the unapproved user.

**Scope**: Test different candidates.

**Action**: Invoke the Vote entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before, the user should have shares to vote.

**Verification Steps**: Verify the candidate of votes can't be higher than the liquid balance.

**Scenario 1**: Test voting for:

- [x] unregistered candidate with power that makes him delegate.
- [x] unregistered candidate with power that won't makes him delegate.
- [x] new candidate.
- [x] candidate with votes.
- [x] banned candidate.

**Scope**: Test candidate replacement.

**Action**: Invoke the Vote entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before, the user should have shares to vote.

**Verification Steps**: Verify the candidate of votes can't be higher than the liquid balance.

**Scenario 1**: Test voting for:

- [ ] new candidate if there if no delegate.
- [ ] new candidate if there is delegate with lower votes.
- [ ] new candidate if there is delegate with higher votes.
- [ ] the delegate.
- [ ] delegate by remove votes for him.

**Scope**: Test candidate .

**Action**: Invoke the Vote entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before, the user should have shares to vote.

**Verification Steps**: Verify the candidate of votes can't be higher than the liquid balance.

**Scenario 1**: Test voting for:

- [ ] unregistered candidate with power that makes him delegate.
- [ ] unregistered candidate with power that won't makes him delegate.
- [ ] new candidate.
- [ ] candidate with votes.

## Test Item: Veto entrypoint

### General Requirements:

1.  Vote is only possible if the user has shares in the pool.
2.  The user cannot exceed the share balance (including the amount of voted tokens).
3.  The other user can veto instead of shares owner if there are enough allowances.
4.  The previous vetos should be removed if the user set veto before for the current delegate.
5.  Total vetos, user liquid balance and last.veto should be updated.
6.  If the amount of vetos for the delegate is higher than the previous, baker is replaced.
7.  If the delegate is reset the vetos should be rest.

## Test Item: Rewards distribution

**Scope**: Test the user's reward distribution.

**Action**: Invoke the DivestLiquidity entrypoint.

**Test Notes and Preconditions**: The exchange should be launched before.

**Verification Steps**: Verify the divestment fails if the the burnt shares are in the range.

**Scenario 1**: Test user rewards distribution of

- [ ] no reward.
- [ ] reward is accomulated.
