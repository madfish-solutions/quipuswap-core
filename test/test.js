const fs = require("fs");

const { address: tokenAddress1 } = JSON.parse(
  fs.readFileSync("./deploy/Token.json").toString()
);

let dexAddress1;
let dexAddress2;

const { address: factoryAddress } = JSON.parse(
  fs.readFileSync("./deploy/Factory.json").toString()
);
const { address: tokenAddress2 } = JSON.parse(
  fs.readFileSync("./deploy/Token2.json").toString()
);

const { Test } = require("./cases");

describe("Correct calls", function () {
  before(async function () {
    dexAddress1 = await Test.before(tokenAddress1);
    dexAddress2 = await Test.before(tokenAddress2);
  });

  describe("InitializeExchange()", function () {
    it("should initialize exchange 1", async function () {
      await Test.initializeExchange(dexAddress1, tokenAddress1);
    });

    it("should initialize exchange 2", async function () {
      await Test.initializeExchange(dexAddress2, tokenAddress2);
    });
  });

  describe("InvestLiquidity()", function () {
    it("should invest liquidity 1", async function () {
      await Test.investLiquidity(dexAddress1, tokenAddress1);
    });

    it("should invest liquidity 2", async function () {
      await Test.investLiquidity(dexAddress2, tokenAddress2);
    });
  });

  describe("TezToTokenSwap()", function () {
    it("should exchange tez to token 1", async function () {
      await Test.tezToTokenSwap(dexAddress1, tokenAddress1);
    });

    it("should exchange tez to token 2", async function () {
      await Test.tezToTokenSwap(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTezSwap()", function () {
    it("should exchange tez to token 1", async function () {
      await Test.tokenToTezSwap(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token 2", async function () {
      await Test.tokenToTezSwap(dexAddress2, tokenAddress2);
    });
  });

  describe("TezToTokenPayment()", function () {
    it("should exchange tez to token and send to requested address 1", async function () {
      await Test.tezToTokenPayment(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token and send to requested address 2", async function () {
      await Test.tezToTokenPayment(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTezPayment()", function () {
    it("should exchange tez to token 1", async function () {
      await Test.tokenToTezPayment(dexAddress1, tokenAddress1);
    });
    it("should exchange tez to token 2", async function () {
      await Test.tokenToTezPayment(dexAddress2, tokenAddress2);
    });
  });

  describe("TokenToTokenSwap()", function () {
    it("should exchange token to token 1", async function () {
      await Test.tokenToTokenSwap(dexAddress1, tokenAddress1, tokenAddress2);
    });

    it("should exchange token to token 2", async function () {
      await Test.tokenToTokenSwap(dexAddress2, tokenAddress2, tokenAddress1);
    });
  });

  describe("DivestLiquidity()", function () {
    it("should divest liquidity 1", async function () {
      await Test.divestLiquidity(dexAddress1, tokenAddress1);
    });

    it("should divest liquidity 2", async function () {
      await Test.divestLiquidity(dexAddress2, tokenAddress2);
    });
  });

  describe("SetVotesDelegation()", function () {
    it("should set vote delegate 1", async function () {
      await Test.setVotesDelegation(dexAddress1);
    });

    it("should set vote delegate 2", async function () {
      await Test.setVotesDelegation(dexAddress2);
    });
  });

  describe("Vote()", function () {
    it("should vote 1", async function () {
      await Test.vote(dexAddress1);
    });

    it("should vote 2", async function () {
      await Test.vote(dexAddress2);
    });
  });

  describe("Default()", function () {
    it("should receive reward 1", async function () {
      await Test.default(dexAddress1);
    });

    it("should receive reward 2", async function () {
      await Test.default(dexAddress2);
    });
  });

  describe("Veto()", function () {
    it("should set veto 1", async function () {
      await Test.veto(dexAddress1);
    });

    it("should set veto 2", async function () {
      await Test.veto(dexAddress2);
    });
  });

  describe("WithdrawProfit()", function () {
    it("should withdraw baker's profit 1", async function () {
      await Test.withdrawProfit(dexAddress1);
    });

    it("should withdraw baker's profit 2", async function () {
      await Test.withdrawProfit(dexAddress2);
    });
  });
});

describe("Incorrect Factory calls", function () {
  before(async function () {
    dexAddress1 = await Test.getDexAddress(tokenAddress1);
    dexAddress2 = await Test.getDexAddress(tokenAddress2);
  });

  describe("SetFunction()", function () {
    it("shouldn't add function with higher index", async function () {
      await Test.setFunctionWithHigherIndex();
    });
    it("shouldn't add function with existed index", async function () {
      await Test.setFunctionWithExistedIndex();
    });
  });

  describe("LaunchExchange()", function () {
    it("shouldn't launch new exchange", async function () {
      await Test.launchExchangeForExistedToken(tokenAddress1);
    });
  });

  describe("InitializeExchange()", function () {
    it("shouldn't initialize exchange with invariant", async function () {
      await Test.initializeExchangeWithInvariant(dexAddress1);
    });
    it("shouldn't initialize exchange with shares", async function () {
      await Test.initializeExchangeWithShares(dexAddress1);
    });
    it("shouldn't initialize exchange without tesz", async function () {
      // TODO: use empty dex!!!
      await Test.initializeExchangeWithoutTez(dexAddress1);
    });
    it("shouldn't initialize exchange without tokens", async function () {
      // TODO: use empty dex!!!
      await Test.initializeExchangeWithoutTokens(dexAddress1);
    });
  });

  describe("TezToTokenPayment()", function () {
    it("shouldn't swap tez if no tez is provided", async function () {
      await Test.tezToTokenPaymentWithoutTez(dexAddress1);
    });
    it("shouldn't swap tez if desirable output is zero", async function () {
      await Test.tezToTokenPaymentWithoutTokens(dexAddress1);
    });
    it("shouldn't swap tez if tokens output is too high", async function () {
      await Test.tezToTokenPaymentWithHighTokensOut(dexAddress1);
    });
    it("should swap tez even if receiver is explicit account(contract)", async function () {
      await Test.tezToTokenPaymentWithExplicitReceiver(
        dexAddress1,
        dexAddress2
      );
    });
  });
  describe("TokenToTezPayment()", function () {
    it("shouldn't swap token if no token is provided", async function () {
      await Test.tokenToTezPaymentWithoutTokens(dexAddress1);
    });
    it("shouldn't swap token if desirable output is zero", async function () {
      await Test.tokenToTezPaymentWithoutTez(dexAddress1);
    });
    it("shouldn't swap token if tez output is too high", async function () {
      await Test.tokenToTezPaymentWithHighTezOut(dexAddress1);
    });
    it("should swap token even if receiver is explicit account(contract)", async function () {
      await Test.tokenToTezPaymentWithExplicitReceiver(
        dexAddress1,
        dexAddress2
      );
    });
  });

  describe("TokenToTokenPayment()", function () {
    it("shouldn't swap token if no token is provided", async function () {
      await Test.tokenToTokenPaymentWithoutTokensIn(dexAddress1, tokenAddress2);
    });
    it("shouldn't swap token if desirable output is zero", async function () {
      await Test.tokenToTokenPaymentWithoutTokensOut(
        dexAddress1,
        tokenAddress2
      );
    });
    it("shouldn't swap token if token output is too high", async function () {
      await Test.tokenToTokenPaymentWithHighTokensOut(
        dexAddress1,
        tokenAddress2
      );
    });
    it("should swap token even if receiver is explicit account(contract)", async function () {
      await Test.tokenToTokenPaymentWithExplicitReceiver(
        dexAddress1,
        tokenAddress2,
        dexAddress1
      );
    });
    it("shouldn't swap token if token pair doesn't exist", async function () {
      await Test.tokenToTokenPaymentToUnexistedToken(
        dexAddress1,
        factoryAddress
      );
    });
  });

  describe("InvestLiquidity()", function () {
    it("shouldn't invest token if no tez is provided", async function () {
      await Test.investLiquidityWithoutTez(dexAddress1);
    });
    it("shouldn't invest token if no token is provided", async function () {
      await Test.investLiquidityWithoutTokens(dexAddress1);
    });
    it("shouldn't invest token if min shares is zero", async function () {
      await Test.investLiquidityWithoutShares(dexAddress1);
    });
    it("shouldn't invest token if min shares are too high", async function () {
      await Test.investLiquidityWithHighShares(dexAddress1);
    });
    it("shouldn't invest liquidity if tez rate is dangerous", async function () {
      await Test.investLiquidityIfTezRateIsDangerous(dexAddress1);
    });
    it("shouldn't invest liquidity if token rate is dangerous", async function () {
      await Test.investLiquidityIfTokenRateIsDangerous(dexAddress1);
    });
  });

  describe("DivestLiquidity()", function () {
    it("shouldn't divest if no shares are burned", async function () {
      await Test.divestLiquidityWithZeroSharesBurned(dexAddress1);
    });
    it("shouldn't divest if min tokens out are zero", async function () {
      await Test.divestLiquidityWithZeroTokensOut(dexAddress1);
    });
    it("shouldn't divest if min tez out are zero", async function () {
      await Test.divestLiquidityWithZeroTezOut(dexAddress1);
    });
    it("shouldn't divest if min tokens out are too high", async function () {
      await Test.divestLiquidityWithHighTokensOut(dexAddress1);
    });
    it("shouldn't divest if min tez out are too high", async function () {
      await Test.divestLiquidityWithHighTezOut(dexAddress1);
    });
  });

  describe("SetVotesDelegation()", function () {
    it("shouldn't fail if set to self", async function () {
      await Test.setVotesDelegationToSelf(dexAddress1);
    });
    it("shouldn't set more than 5", async function () {
      await Test.setVotesDelegationToMoreThanFiveDeputies(dexAddress1);
    });
  });

  describe("Vote()", function () {
    it("shouldn't vote if not allowed deputy", async function () {
      await Test.voteWithoutPersmission(dexAddress1);
    });
    it("shouldn't vote for vetted", async function () {
      await Test.voteForVetted(dexAddress1);
    });
    it("shouldn't vote without shares", async function () {
      await Test.voteWithoutShares(dexAddress1);
    });
  });

  describe("WithdrawProfit()", function () {
    it("should withdraw even if nothing to withdraw", async function () {
      await Test.withdrawProfitWithoutProfit(dexAddress1);
    });
  });

  describe("Veto()", function () {
    it("shouldn't make veto if shares weren't changed", async function () {
      await Test.vetoWithOldShares(dexAddress1);
    });
    it("shouldn't make veto without permission", async function () {
      await Test.vetoWithoutPermission(dexAddress1);
    });
    it("shouldn't make veto for None candidate", async function () {
      await Test.vetoWithoutCandidate(dexAddress1);
    });
  });
});
