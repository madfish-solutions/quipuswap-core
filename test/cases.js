const { setup, getContractFullStorage, sleep } = require("./utils");
const { Dex } = require("./dex");
const { Factory, factoryAddress } = require("./factory");
const assert = require("assert");

class Test {
  static async before(tokenAddress) {
    let tezos = await setup();
    let tezos1 = await setup("../key1");
    let token = await tezos.contract.at(tokenAddress);
    let operation = await token.methods
      .transfer(
        await tezos.signer.publicKeyHash(),
        await tezos1.signer.publicKeyHash(),
        "100000"
      )
      .send();
    await operation.confirmation();

    let factory = await Factory.init(tezos);
    operation = await factory.launchExchange(tokenAddress);
    await operation.confirmation();
    assert(operation.status === "applied", "Operation was not applied");

    let storage = await factory.getFullStorage({
      tokenToExchange: [tokenAddress],
    });
    return storage.tokenToExchangeExtended[tokenAddress];
  }

  static async getDexAddress(tokenAddress) {
    let tezos = await setup();
    let factory = await Factory.init(tezos);
    let storage = await factory.getFullStorage({
      tokenToExchange: [tokenAddress],
    });
    return storage.tokenToExchangeExtended[tokenAddress];
  }

  static async initializeExchange(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.feeRate == 333);
    assert(initialStorage.storage.invariant == 0);
    assert(initialStorage.storage.totalShares == 0);
    assert(initialStorage.storage.tezPool == 0);
    assert(initialStorage.storage.tokenPool == 0);
    assert(initialStorage.storage.tokenAddress == tokenAddress);
    assert(initialStorage.storage.factoryAddress == factoryAddress);
    assert(initialStorage.sharesExtended[pkh] == undefined);

    let operation = await dex.initializeExchange(tokenAmount, tezAmount);
    assert(operation.status === "applied", "Operation was not applied");

    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const mutezAmount = parseFloat(tezAmount) * 1000000;
    assert(finalStorage.storage.feeRate == 333);
    assert(
      finalStorage.storage.invariant == mutezAmount * parseInt(tokenAmount)
    );
    assert(finalStorage.storage.tezPool == mutezAmount);
    assert(finalStorage.storage.tokenPool == tokenAmount);
    assert(finalStorage.storage.tokenAddress == tokenAddress);
    assert(finalStorage.storage.factoryAddress == factoryAddress);
    assert(finalStorage.sharesExtended[pkh] == 1000);
    assert(finalStorage.storage.totalShares == 1000);
  }

  static async setFunctionWithHigherIndex() {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);
    let index = 11;
    let initialStorage = await factory.getFullStorage({ lambdas: [index] });
    let lambda = "initializeExchange";
    assert(initialStorage.lambdas[index] == undefined);
    try {
      await factory.setFunction(index, lambda);
      assert(false, "Adding function should fail");
    } catch (e) {
      assert(
        e.message === "Factory/functions-set",
        "Adding function should fail"
      );
    }

    let finalStorage = await factory.getFullStorage({ lambdas: [index] });
    assert(finalStorage.lambdas[index] == undefined);
  }

  static async setFunctionWithExistedIndex() {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);
    let index = 1;
    let initialStorage = await factory.getFullStorage({ lambdas: [index] });
    let lambda = "initializeExchange";

    assert(initialStorage.lambdas[index] == undefined);
    try {
      await factory.setFunction(index, lambda);
      assert(false, "Adding function should fail");
    } catch (e) {
      assert(
        e.message === "Factory/function-set",
        "Adding function should fail"
      );
    }

    let finalStorage = await factory.getFullStorage({ lambdas: [index] });
    assert(finalStorage.lambdas[index] == undefined);
  }

  static async launchExchangeForExistedToken(tokenAddress) {
    let AliceTezos = await setup();
    let factory = await Factory.init(AliceTezos);

    try {
      await factory.launchExchange(tokenAddress);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(
        e.message === "Factory/exchange-launched",
        "Adding function should fail"
      );
    }
  }

  static async initializeExchangeWithInvariant(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/non-allowed", "Adding function should fail");
    }
  }

  static async initializeExchangeWithShares(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "1.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/non-allowed", "Adding function should fail");
    }
  }

  static async initializeExchangeWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "0";
    const tezAmount = "1.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/non-allowed", "Adding function should fail");
    }
  }

  static async tezToTokenPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async tokenToTokenPaymentWithoutTokensIn(dexAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }
  static async tokenToTokenPaymentToUnexistedToken(dexAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "MAP FIND", "Adding function should fail");
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
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
    assert(operation.status === "applied", "Operation was not applied");
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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
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
      assert(e.message === "Dex/high-min-out", "Adding function should fail");
    }
  }

  static async investLiquidityWithoutTez(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async divestLiquidityWithZeroSharesBurned(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 0;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async divestLiquidityWithZeroTokensOut(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-out", "Adding function should fail");
    }
  }

  static async divestLiquidityWithHighTokensOut(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-out", "Adding function should fail");
    }
  }

  static async divestLiquidityWithZeroTezOut(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-out", "Adding function should fail");
    }
  }

  static async divestLiquidityWithHighTezOut(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-out", "Adding function should fail");
    }
  }

  static async voteWithoutPersmission(dexAddress) {
    let AliceTezos = await setup("../key2");
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = await AliceTezos.signer.publicKeyHash();

    const bobPkh = await BobTezos.signer.publicKeyHash();

    try {
      await dex.vote(bobPkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(
        e.message === "Dex/vote-not-permitted",
        "Adding function should fail"
      );
    }
  }

  static async voteWithoutShares(dexAddress) {
    let AliceTezos = await setup("../key2");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let delegate = await AliceTezos.signer.publicKeyHash();

    const alicePkh = await AliceTezos.signer.publicKeyHash();

    try {
      await dex.vote(pkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/no-shares", "Adding function should fail");
    }
  }

  static async voteForVetted(dexAddress) {
    let AliceTezos = await setup("../key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    // let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    let delegate = await BobTezos.signer.publicKeyHash();

    const pkh = await AliceTezos.signer.publicKeyHash();

    try {
      await dex.vote(pkh, delegate);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      let initialStorage = await dex.getFullStorage({ vetos: [delegate] });
      assert(e.message === "Dex/veto-candidate", "Adding function should fail");
    }
  }

  static async setVotesDelegationToSelf(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    const pkh = await AliceTezos.signer.publicKeyHash();

    let operation = await dex.setVotesDelegation(pkh, true);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [pkh] });
    assert(!finalStorage.votersExtended[pkh].allowances.includes(pkh));
  }

  static async setVotesDelegationToMoreThanFiveDeputies(dexAddress) {
    let AliceTezos = await setup("../key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const pkh = await AliceTezos.signer.publicKeyHash();
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
        assert(operation.status === "applied", "Operation was not applied");
      }
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(
        e.message === "Dex/many-voter-delegates",
        "Adding function should fail"
      );
    }
  }

  static async investLiquidityWithoutTokens(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/veto-candidate", "Adding function should fail");
    }
  }

  static async investLiquidityWithoutShares(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }
  static async investLiquidityWithHighShares(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }
  static async investLiquidityIfTezRateIsDangerous(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.0001";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }
  static async investLiquidityIfTokenRateIsDangerous(dexAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.000001";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async tokenToTezPaymentWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();

    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async tokenToTezPaymentWithExplicitReceiver(dexAddress, receiver) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await AliceTezos.signer.publicKeyHash();

    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
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
    assert(operation.status === "applied", "Operation was not applied");
  }

  static async tokenToTezPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";

    try {
      await dex.tokenToTezSwap(tokensIn, 0);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
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
      assert(
        e.message === "Dex/high-min-tez-out",
        "Adding function should fail"
      );
    }
  }

  static async tezToTokenPaymentWithExplicitReceiver(dexAddress, receiver) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.001";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
    assert(operation.status === "applied", "Operation was not applied");
  }

  static async tezToTokenPaymentWithoutTokens(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.01";

    try {
      await dex.tezToTokenSwap(0, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
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
      assert(e.message === "Dex/high-min-out", "Adding function should fail");
    }
  }

  static async tezToTokenPaymentWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });

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
      assert(e.message === "Dex/wrong-params", "Adding function should fail");
    }
  }

  static async initializeExchangeWithoutTez(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const tokenAmount = "1000";
    const tezAmount = "0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });
    assert(initialStorage.storage.invariant > 0);
    assert(initialStorage.storage.totalShares > 0);

    try {
      await dex.initializeExchange(tokenAmount, tezAmount);
      assert(false, "Adding token pair should fail");
    } catch (e) {
      assert(e.message === "Dex/non-allowed", "Adding function should fail");
    }
  }

  static async investLiquidity(dexAddress, tokenAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "5.0";
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

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
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    assert(finalStorage.sharesExtended[pkh] == minShares);
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount)
    );
    assert(
      finalStorage.storage.totalShares ==
        parseInt(initialStorage.storage.totalShares) + parseInt(minShares)
    );
    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialStorage.storage.tokenPool) + parseInt(tokenAmount))
    );
  }

  static async tokenToTezSwap(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await AliceTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(pkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
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
    assert(operation.status === "applied", "Operation was not applied");

    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tokenToTokenSwap(dexAddress, tokenAddress, tokenAddressTo) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await AliceTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(pkh);
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
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
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance <= parseInt(initialTezBalance));
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async tezToTokenSwap(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.01";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({ shares: [pkh] });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const initialTezBalance = await AliceTezos.tz.getBalance(pkh);

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
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) +
          parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tezToTokenPayment(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tezAmount = "0.1";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    const initialDexStorage = await dex.getFullStorage({
      shares: [pkh, bobPkh],
    });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh, bobPkh] }
    );
    const initialTezBalance = await AliceTezos.tz.getBalance(pkh);

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
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [bobPkh] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(pkh);

    assert(
      finalTokenStorage.ledgerExtended[bobPkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[bobPkh].balance) +
          parseInt(minTokens)
    );
    assert(
      finalTezBalance < parseInt(initialTezBalance) - parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) + parseInt(mutezAmount)) *
          (parseInt(initialDexStorage.storage.tokenPool) - parseInt(minTokens))
    );
  }

  static async tokenToTezPayment(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let tokensIn = "1000";
    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();

    const initialTezBalance = await AliceTezos.tz.getBalance(bobPkh);
    const initialDexStorage = await dex.getFullStorage({
      shares: [pkh, bobPkh],
    });
    const initialTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh, bobPkh] }
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
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    const finalTokenStorage = await getContractFullStorage(
      AliceTezos,
      tokenAddress,
      { ledger: [pkh, bobPkh] }
    );
    const finalTezBalance = await AliceTezos.tz.getBalance(bobPkh);

    assert(
      finalTokenStorage.ledgerExtended[pkh].balance ==
        parseInt(initialTokenStorage.ledgerExtended[pkh].balance) -
          parseInt(tokensIn)
    );
    assert(finalTezBalance >= parseInt(initialTezBalance));
    assert(
      finalTezBalance <= parseInt(initialTezBalance) + parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn)
    );

    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialDexStorage.storage.tezPool) - parseInt(minTezOut)) *
          (parseInt(initialDexStorage.storage.tokenPool) + parseInt(tokensIn))
    );
  }

  static async divestLiquidity(dexAddress, tokenAddress) {
    let AliceTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    let sharesBurned = 10;
    const pkh = await AliceTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ shares: [pkh] });

    const tezPerShare = parseInt(
      initialStorage.storage.tezPool / initialStorage.storage.totalShares
    );
    const tokensPerShare = parseInt(
      initialStorage.storage.tokenPool / initialStorage.storage.totalShares
    );
    const minTez = tezPerShare * sharesBurned;
    const minTokens = tokensPerShare * sharesBurned;
    let operation = await dex.divestLiquidity(minTokens, minTez, sharesBurned);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ shares: [pkh] });

    assert(
      finalStorage.sharesExtended[pkh] ==
        initialStorage.sharesExtended[pkh] - sharesBurned
    );
    assert(
      finalStorage.storage.tezPool ==
        parseInt(initialStorage.storage.tezPool) - minTez
    );
    assert(
      finalStorage.storage.tokenPool ==
        parseInt(initialStorage.storage.tokenPool) - minTokens
    );
    assert(
      finalStorage.storage.totalShares ==
        parseInt(initialStorage.storage.totalShares) - sharesBurned
    );
    assert(
      finalStorage.storage.invariant ==
        (parseInt(initialStorage.storage.tezPool) - minTez) *
          (parseInt(initialStorage.storage.tokenPool) - minTokens)
    );
  }

  static async setVotesDelegation(dexAddress) {
    let AliceTezos = await setup("../key1");
    let BobTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);
    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [pkh] });

    assert(!initialStorage.votersExtended[pkh]);

    let operation = await dex.setVotesDelegation(bobPkh, true);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [pkh] });
    assert(finalStorage.votersExtended[pkh].allowances.includes(bobPkh));
  }

  static async vote(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    // let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    let delegate = await AliceTezos.signer.publicKeyHash();

    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [bobPkh] });

    assert(initialStorage.votersExtended[bobPkh].allowances.includes(pkh));
    assert(!initialStorage.votersExtended[bobPkh].candidate);
    assert(!initialStorage.storage.delegated);

    let operation = await dex.vote(bobPkh, delegate);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [bobPkh] });
    assert(finalStorage.votersExtended[bobPkh].candidate == delegate);
    assert(finalStorage.storage.delegated == delegate);
  }

  static async default(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    // let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    let delegate = await AliceTezos.signer.publicKeyHash();
    let reward = 1;

    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({ voters: [bobPkh] });

    assert(initialStorage.storage.delegated == delegate);

    let operation = await dex.sendReward(reward);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ voters: [bobPkh] });
    assert(finalStorage.storage.currentDelegated == delegate);
  }

  static async withdrawProfit(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(BobTezos, dexAddress);
    let reward = 10;
    let amount = 1;

    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();
    let initialStorage = await dex.getFullStorage({
      circleLoyalty: [bobPkh],
      shares: [bobPkh],
    });

    await sleep(3000);

    let operation = await dex.sendReward(amount);
    assert(operation.status === "applied", "Operation was not applied");

    operation = await dex.withdrawProfit(bobPkh);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({ circleLoyalty: [bobPkh] });
    operation = await dex.sendReward(amount);
    assert(operation.status === "applied", "Operation was not applied");
    finalStorage = await dex.getFullStorage({ circleLoyalty: [bobPkh] });
  }

  static async withdrawProfitWithoutProfit(dexAddress) {
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(BobTezos, dexAddress);
    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.withdrawProfit(bobPkh);
      await dex.withdrawProfit(bobPkh);
    } catch (e) {
      assert(
        e.message === "(branch) proto.006-PsCARTHA.contract.empty_transaction",
        "Adding function should fail"
      );
    }
  }

  static async vetoWithOldShares(dexAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);

    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.veto(bobPkh);
    } catch (e) {
      assert(e.message === "Dex/old-shares", "Adding function should fail");
    }
  }
  static async vetoWithoutCandidate(dexAddress) {
    let AliceTezos = await setup();
    let dex = await Dex.init(AliceTezos, dexAddress);

    const pkh = await AliceTezos.signer.publicKeyHash();
    try {
      await dex.veto(pkh);
    } catch (e) {
      assert(e.message === "Dex/no-delegated", "Adding function should fail");
    }
  }

  static async vetoWithoutPermission(dexAddress) {
    let AliceTezos = await setup("../key2");
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);

    const bobPkh = await BobTezos.signer.publicKeyHash();
    try {
      await dex.veto(bobPkh);
    } catch (e) {
      assert(
        e.message === "Dex/vote-not-permitted",
        "Adding function should fail"
      );
    }
  }

  static async veto(dexAddress, tokenAddress) {
    let AliceTezos = await setup();
    let BobTezos = await setup("../key1");
    let dex = await Dex.init(AliceTezos, dexAddress);
    // let delegate = "tz1VxS7ff4YnZRs8b4mMP4WaMVpoQjuo1rjf";
    let delegate = await AliceTezos.signer.publicKeyHash();

    const pkh = await AliceTezos.signer.publicKeyHash();
    const bobPkh = await BobTezos.signer.publicKeyHash();

    let operation = await dex.veto(bobPkh);
    assert(operation.status === "applied", "Operation was not applied");
    let finalStorage = await dex.getFullStorage({});
    assert(finalStorage.storage.veto == 0);
    assert(!finalStorage.storage.currentDelegated);
  }
}
exports.Test = Test;
