const { setup, getContractFullStorage, sleep } = require("./utils");
const { Dex } = require("./dexFA2");
const { Factory, factoryAddress } = require("./factoryFA2");
// const { Dex } = require("./dex");
// const { Factory, factoryAddress } = require("./factory");
const assert = require("assert");
const TEST_RPC = "http://127.0.0.1:8732";
const TOKEN_IDX = 1;
class Test {
  static async before(tokenAddress) {
    let tezos = await setup();
    let tezos1 = await setup("../fixtures/key1");
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .transfer([
        {
          from_: await tezos.signer.publicKeyHash(),
          txs: [
            {
              token_id: 1,
              amount: 100000,
              to_: await tezos1.signer.publicKeyHash(),
            },
          ],
        },
      ])
      .send();
    await operation.confirmation();

    let factory = await Factory.init(tezos);
    operation = await factory.launchExchange(tokenAddress, TOKEN_IDX);
    await operation.confirmation();
    assert.equal(operation.status, "applied", "Operation was not applied");

    let storage = await factory.getFullStorage({
      tokenToExchange: [[tokenAddress, TOKEN_IDX]],
    });
    return storage.tokenToExchangeExtended[[tokenAddress, TOKEN_IDX]];
  }

  static async getDexAddress(tokenAddress) {
    let tezos = await setup();
    let factory = await Factory.init(tezos);
    let storage = await factory.getFullStorage({
      tokenToExchange: [[tokenAddress, TOKEN_IDX]],
    });
    return storage.tokenToExchangeExtended[[tokenAddress, TOKEN_IDX]];
  }

  static async initializeExchange(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });
    assert.equal(initialStorage.storage.feeRate, 333);
    assert.equal(initialStorage.storage.invariant, 0);
    assert.equal(initialStorage.storage.totalShares, 0);
    assert.equal(initialStorage.storage.tezPool, 0);
    assert.equal(initialStorage.storage.tokenPool, 0);
    assert.equal(initialStorage.storage.tokenAddress, tokenAddress);
    assert.equal(initialStorage.storage.factoryAddress, factoryAddress);
    assert.equal(initialStorage.sharesExtended[alicePkh], undefined);

    let operation = await dex.initializeExchange(tokenAmount, tezAmount);
    assert.equal(operation.status, "applied", "Operation was not applied");

    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    assert.equal(finalStorage.storage.feeRate, 333);
    assert.equal(
      finalStorage.storage.invariant,
      mutezAmount * parseInt(tokenAmount)
    );
    assert.equal(finalStorage.storage.tezPool, mutezAmount);
    assert.equal(finalStorage.storage.tokenPool, tokenAmount);
    assert.equal(finalStorage.storage.tokenAddress, tokenAddress);
    assert.equal(finalStorage.storage.factoryAddress, factoryAddress);
    assert.equal(finalStorage.sharesExtended[alicePkh], 1000);
    assert.equal(finalStorage.storage.totalShares, 1000);
  }

  static async setFunctionWithHigherIndex() {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);
    let index = 10;
    let initialStorage = await factory.getFullStorage({ lambdas: [index] });
    let lambda = "initializeExchange";
    assert.equal(initialStorage.lambdas[index], undefined);
    try {
      await factory.setFunction(index, lambda);
      assert(false, "Adding function should fail");
    } catch (e) {
      assert.equal(e.message, "Factory/wrong-index");
    }

    let finalStorage = await factory.getFullStorage({ lambdas: [index] });
    assert.equal(finalStorage.lambdas[index], undefined);
  }

  static async setFunctionWithExistedIndex() {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);
    let index = 1;
    let initialStorage = await factory.getFullStorage({ lambdas: [index] });
    let lambda = "initializeExchange";

    assert.equal(initialStorage.lambdas[index], undefined);
    try {
      await factory.setFunction(index, lambda);
      assert(false, "Adding function should fail");
    } catch (e) {
      assert.equal(e.message, "Factory/function-set");
    }

    let finalStorage = await factory.getFullStorage({ lambdas: [index] });
    assert.equal(finalStorage.lambdas[index], undefined);
  }

  static async launchExchangeForExistedToken(tokenAddress) {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);

    try {
      await factory.launchExchange(tokenAddress, TOKEN_IDX);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Factory/exchange-launched");
    }
  }

  static async initializeExchangeWithInvariant(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/non-allowed");
    }
  }

  static async initializeExchangeWithShares(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/non-allowed");
    }
  }

  static async initializeExchangeWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "0";
    const tezAmount = "1.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/non-allowed");
    }
  }

  static async tezToTokenPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    try {
      await dex.tezToTokenSwap(minTokens, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async tokenToTokenPaymentWithoutTokensIn(dexAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    const tokensOut = 1;

    try {
      await dex.tokenToTokenSwap(tokensIn, tokensOut, tokenAddressTo);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }
  static async tokenToTokenPaymentToUnexistedToken(dexAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    const tokensOut = 1;

    try {
      await dex.tokenToTokenSwap(tokensIn, tokensOut, tokenAddressTo);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "MAP FIND");
    }
  }

  static async tokenToTokenPaymentWithExplicitReceiver(
    dexAddress,
    tokenAddressTo,
    receiver
  ) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    const tokensOut = 1;

    let operation = await dex.tokenToTokenPayment(
      tokensIn,
      tokensOut,
      tokenAddressTo,
      receiver
    );
    assert.equal(operation.status, "applied", "Operation was not applied");
  }

  static async tokenToTokenPaymentWithoutTokensOut(dexAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokensIn = "1000";
    const tokensOut = 0;

    try {
      await dex.tokenToTokenSwap(tokensIn, tokensOut, tokenAddressTo);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async tokenToTokenPaymentWithHighTokensOut(
    dexAddress,
    tokenAddressTo
  ) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokensIn = "1000";
    const tokensOut = 1000000000;

    try {
      await dex.tokenToTokenSwap(tokensIn, tokensOut, tokenAddressTo);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/high-min-out");
    }
  }

  static async investLiquidityWithoutTez(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, minShares);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async divestLiquidityWithZeroSharesBurned(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 0;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    try {
      await dex.divestLiquidity(minTokens, minTez, sharesBurned);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async divestLiquidityWithZeroTokensOut(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    try {
      await dex.divestLiquidity(0, minTez, sharesBurned);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-out");
    }
  }

  static async divestLiquidityWithHighTokensOut(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    try {
      await dex.divestLiquidity(100000000, minTez, sharesBurned);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-out");
    }
  }

  static async divestLiquidityWithZeroTezOut(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTokens = tokensPerShare * sharesBurned;
    try {
      await dex.divestLiquidity(minTokens, 0, sharesBurned);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-out");
    }
  }

  static async divestLiquidityWithHighTezOut(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTokens = tokensPerShare * sharesBurned;
    try {
      await dex.divestLiquidity(minTokens, 100000000, sharesBurned);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-out");
    }
  }

  static async voteWithoutPersmission(dexAddress) {
    let AliceTezos = await setup("../fixtures/key2");
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = await AliceTezos.signer.publicKeyHash();

    const bobPkh = await BobTezos.signer.publicKeyHash();

    try {
      await dex.vote(bobPkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/vote-not-permitted");
    }
  }

  static async voteWithoutShares(dexAddress) {
    let AliceTezos = await setup("../fixtures/key2");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = await AliceTezos.signer.publicKeyHash();

    const alicePkh = await AliceTezos.signer.publicKeyHash();

    try {
      await dex.vote(alicePkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/no-shares");
    }
  }

  static async voteForVetted(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    if (AliceTezos.rpc.getRpcUrl() == TEST_RPC) {
      delegate = await BobTezos.signer.publicKeyHash();
    }

    const alicePkh = await AliceTezos.signer.publicKeyHash();

    try {
      await dex.vote(alicePkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/veto-candidate");
    }
  }

  static async setVotesDelegationToSelf(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    const alicePkh = await AliceTezos.signer.publicKeyHash();

    let operation = await dex.setVotesDelegation(alicePkh, true);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [alicePkh] });
    assert(
      !finalStorage.votersExtended[alicePkh].allowances.includes(alicePkh)
    );
  }

  static async setVotesDelegationToMoreThanFiveDeputies(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const pkhs = [
      "tz1Lmi1HELe8hNbw1heWwpHgdLM7DaPJuZvq",
      "tz1SVwdLNf3ANMQE1AXrxS1pBG8tcn2joVZg",
      "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf",
      "tz1aWXP237BLwNHJcCD4b3DutCevhqq2T1Z9",
      "tz1NRTQeqcuwybgrZfJavBY3of83u8uLpFBj",
      "tz1T8UYSbVuRm6CdhjvwCfXsKXb4yL9ai9Q3",
    ];

    try {
      for (const user of pkhs) {
        let operation = await dex.setVotesDelegation(user, true);
        assert.equal(operation.status, "applied", "Operation was not applied");
      }
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/many-voter-delegates");
    }
  }

  static async investLiquidityWithoutTokens(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = 0;
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, minShares);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/veto-candidate");
    }
  }

  static async investLiquidityWithoutShares(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, 0);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }
  static async investLiquidityWithHighShares(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, 100000000000);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }
  static async investLiquidityIfTezRateIsDangerous(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.0001";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, minShares);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }
  static async investLiquidityIfTokenRateIsDangerous(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.000001";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );
    try {
      await dex.investLiquidity(tokenAmount, tezAmount, minShares);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async tokenToTezPaymentWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();

    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });
    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );

    try {
      await dex.tokenToTezSwap(tokensIn, minTezOut);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async tokenToTezPaymentWithExplicitReceiver(dexAddress, receiver) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();

    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });
    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );

    let operation = await dex.tokenToTezPayment(tokensIn, minTezOut, receiver);
    assert.equal(operation.status, "applied", "Operation was not applied");
  }

  static async tokenToTezPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";

    try {
      await dex.tokenToTezSwap(tokensIn, 0);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async tokenToTezPaymentWithHighTezOut(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";

    try {
      await dex.tokenToTezSwap(tokensIn, 10000000000);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/high-min-tez-out");
    }
  }

  static async tezToTokenPaymentWithExplicitReceiver(dexAddress, receiver) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.001";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    let operation = await dex.tezToTokenPayment(minTokens, tezAmount, receiver);
    assert.equal(operation.status, "applied", "Operation was not applied");
  }

  static async tezToTokenPaymentWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.01";

    try {
      await dex.tezToTokenSwap(0, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }
  static async tezToTokenPaymentWithHighTokensOut(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.01";

    try {
      await dex.tezToTokenSwap(100000000, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/high-min-out");
    }
  }

  static async tezToTokenPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    try {
      await dex.tezToTokenSwap(minTokens, tezAmount);
    } catch (e) {
      assert.equal(e.message, "Dex/wrong-params");
    }
  }

  static async initializeExchangeWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert.equal(e.message, "Dex/non-allowed");
    }
  }

  static async investLiquidity(dexAddress, tokenAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    const minShares = parseInt(
      (mutezAmount / initialStorage.storage.tezPool) *
        initialStorage.storage.totalShares
    );
    const tokenAmount = parseInt(
      (minShares * initialStorage.storage.tokenPool) /
        initialStorage.storage.totalShares
    );

    let operation = await dex.investLiquidity(
      tokenAmount,
      tezAmount,
      minShares
    );
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    assert.equal(finalStorage.sharesExtended[alicePkh], minShares);
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount)
    );
    assert.equal(
      finalStorage.storage.totalShares,
      parseInt(initialStorage.storage.totalShares) + parseInt(minShares)
    );
    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount))
    );
  }

  static async tokenToTezSwap(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(alicePkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );

    let operation = await dex.tokenToTezSwap(tokensIn, minTezOut);
    assert.equal(operation.status, "applied", "Operation was not applied");

    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    assert.equal(
      finalTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]],
      parseInt(
        initialTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]]
      ) - parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
        (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tokenToTokenSwap(dexAddress, tokenAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(alicePkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    const tokensOut = 1;
    let operation = await dex.tokenToTokenSwap(
      tokensIn,
      tokensOut,
      tokenAddressTo
    );
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    assert.equal(
      finalTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]],
      parseInt(
        initialTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]]
      ) - parseInt(tokensIn)
    );
    assert(finalTezBalance <= parseInt(initialTezBalance));
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
        (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tezToTokenSwap(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.01";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [alicePkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );
    const initialTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    let operation = await dex.tezToTokenSwap(minTokens, tezAmount);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[alicePkh, TOKEN_IDX]] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    assert.equal(
      finalTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]],
      parseInt(
        initialTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]]
      ) + parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tezToTokenPayment(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.1";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({
      shares: [alicePkh, bobPkh],
    });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      {
        tokensLedger: [
          [alicePkh, TOKEN_IDX],
          [bobPkh, TOKEN_IDX],
        ],
      }
    );
    const initialTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    const mutezAmount = parseFloat(tezAmount) * 1000000;

    const fee = parseInt(mutezAmount / initialDexStorage.storage.feeRate);
    const newTezPool = parseInt(
      +initialDexStorage.storage.tezPool + +mutezAmount
    );
    const tempTezPool = parseInt(newTezPool - fee);
    const newTokenPool = parseInt(
      initialDexStorage.storage.invariant / tempTezPool
    );

    const minTokens = parseInt(
      parseInt(initialDexStorage.storage.tokenPool - newTokenPool)
    );

    let operation = await dex.tezToTokenPayment(minTokens, tezAmount, bobPkh);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { tokensLedger: [[bobPkh, TOKEN_IDX]] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(alicePkh);

    assert.equal(
      finalTokenStorage.tokensLedgerExtended[[bobPkh, TOKEN_IDX]],
      parseInt(initialTokenStorage.tokensLedgerExtended[[bobPkh, TOKEN_IDX]]) +
        parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
        (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tokenToTezPayment(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(bobPkh);
    const initialDexStorage = await dex.getFullStorage({
      shares: [alicePkh, bobPkh],
    });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      {
        tokensLedger: [
          [alicePkh, TOKEN_IDX],
          [bobPkh, TOKEN_IDX],
        ],
      }
    );

    const fee = parseInt(tokensIn / initialDexStorage.storage.feeRate);
    const newTokenPool = parseInt(
      +initialDexStorage.storage.tokenPool + +tokensIn
    );
    const tempTokenPool = parseInt(newTokenPool - fee);
    const newTezPool = parseInt(
      initialDexStorage.storage.invariant / tempTokenPool
    );

    const minTezOut = parseInt(
      parseInt(initialDexStorage.storage.tezPool - newTezPool)
    );
    let operation = await dex.tokenToTezPayment(tokensIn, minTezOut, bobPkh);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      {
        tokensLedger: [
          [alicePkh, TOKEN_IDX],
          [bobPkh, TOKEN_IDX],
        ],
      }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(bobPkh);

    assert.equal(
      finalTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]],
      parseInt(
        initialTokenStorage.tokensLedgerExtended[[alicePkh, TOKEN_IDX]]
      ) - parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
        (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async divestLiquidity(dexAddress, tokenAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [alicePkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    let operation = await dex.divestLiquidity(minTokens, minTez, sharesBurned);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [alicePkh] });

    assert.equal(
      finalStorage.sharesExtended[alicePkh],
      initialStorage.sharesExtended[alicePkh] - sharesBurned
    );
    assert.equal(
      finalStorage.storage.tezPool,
      parseInt(initialStorage.storage.tezPool) - minTez
    );
    assert.equal(
      finalStorage.storage.tokenPool,
      parseInt(initialStorage.storage.tokenPool) - minTokens
    );
    assert.equal(
      finalStorage.storage.totalShares,
      parseInt(initialStorage.storage.totalShares) - sharesBurned
    );
    assert.equal(
      finalStorage.storage.invariant,
      (parseInt(initialStorage.storage.tezPool) - minTez) *
        (parseInt(initialStorage.storage.tokenPool) - minTokens)
    );
  }

  static async setVotesDelegation(dexAddress) {
    let AliceTezos = await setup("../fixtures/key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [alicePkh] });

    assert(!initialStorage.votersExtended[alicePkh]);

    let operation = await dex.setVotesDelegation(bobPkh, true);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [alicePkh] });
    assert(finalStorage.votersExtended[alicePkh].allowances.includes(bobPkh));
  }

  static async vote(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    if (AliceTezos.rpc.getRpcUrl() == TEST_RPC) {
      delegate = await AliceTezos.signer.publicKeyHash();
    }

    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [bobPkh] });

    assert(initialStorage.votersExtended[bobPkh].allowances.includes(alicePkh));
    assert(!initialStorage.votersExtended[bobPkh].candidate);
    assert(!initialStorage.storage.delegated);

    let operation = await dex.vote(bobPkh, delegate);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [bobPkh] });
    assert.equal(finalStorage.votersExtended[bobPkh].candidate, delegate);
    assert.equal(finalStorage.storage.delegated, delegate);
  }

  static async default(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    if (AliceTezos.rpc.getRpcUrl() == TEST_RPC) {
      delegate = await AliceTezos.signer.publicKeyHash();
    }
    let reward = 1;

    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [bobPkh] });

    assert.equal(initialStorage.storage.delegated, delegate);

    let operation = await dex.sendReward(reward);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [bobPkh] });
    assert.equal(finalStorage.storage.currentDelegated, delegate);
  }

  static async withdrawProfit(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(BobTezos, dexAddress);
    let reward = 10;
    let amount = 1;

    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({
      circleLoyalty: [bobPkh],
      shares: [bobPkh],
    });

    await sleep(3000);

    let operation = await dex.sendReward(amount);
    assert.equal(operation.status, "applied", "Operation was not applied");

    operation = await dex.withdrawProfit(bobPkh);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ circleLoyalty: [bobPkh] });
    operation = await dex.sendReward(amount);
    assert.equal(operation.status, "applied", "Operation was not applied");
    finalStorage = await dex.getFullStorage({ circleLoyalty: [bobPkh] });
  }

  static async withdrawProfitWithoutProfit(dexAddress) {
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(BobTezos, dexAddress);
    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.withdrawProfit(bobPkh);
      await dex.withdrawProfit(bobPkh);
    } catch (e) {
      assert.equal(
        e.message,
        "(branch) proto.006-PsCARTHA.contract.empty_transaction"
      );
    }
  }

  static async vetoWithOldShares(dexAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);

    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.veto(bobPkh);
    } catch (e) {
      assert.equal(e.message, "Dex/old-shares", "Adding function should fail");
    }
  }
  static async vetoWithoutCandidate(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);

    const alicePkh = await AliceTezos.signer.publicKeyHash();
    try {
      await dex.veto(alicePkh);
    } catch (e) {
      assert.equal(
        e.message,
        "Dex/no-delegated",
        "Adding function should fail"
      );
    }
  }

  static async vetoWithoutPermission(dexAddress) {
    let AliceTezos = await setup("../fixtures/key2");
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);

    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.veto(bobPkh);
    } catch (e) {
      assert.equal(e.message, "Dex/vote-not-permitted");
    }
  }

  static async veto(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../fixtures/key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    if (AliceTezos.rpc.getRpcUrl() == TEST_RPC) {
      delegate = await AliceTezos.signer.publicKeyHash();
    }

    const alicePkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();

    let operation = await dex.veto(bobPkh);
    assert.equal(operation.status, "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({});
    assert.equal(finalStorage.storage.veto, 0);
    assert(!finalStorage.storage.currentDelegated);
  }
}
exports.Test = Test;
