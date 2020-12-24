## General Requirements:

1. Initialization is only possible during deployment or if there is no shares.
2. The assets amount cannot be zero during initialization.
3. The user receives 1000 shares.
4. Each token can have the only pair.
5. Info about previous rewards (if any) should be reset.

## Test cases

### Test Item: InitializeExchange Entrypoint

Scope: Test various ways to initialize the contract.
Action: Invoke the InitializeExchange entrypoint.
Test Notes and Preconditions: Ensure all the initialize approaches work.
Verification Steps: Verify the exchange is initialized and the initial state is correct.

Scenario 1: Test initialize during the deployment when

- [x] the pair doesn't exist
- [x] the amount of XTZ is zero
- [x] the amount of token is zero
- [x] the token isn't approved
- [x] the pair exists

Scenario 2: Test initialize after liquidity withdrawn when

- [x] liquidity is zero
- [x] liquidity isn't zero
- [x] the amount of XTZ is zero
- [x] the amount of token is zero
- [ ] the token isn't approved
