import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
const standard = process.env.npm_package_config_standard;

contract.only("Veto()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const carolAddress: string = accounts.carol.pkh;
  const tezAmount: number = 10000;
  const tokenAmount: number = 1000000;
  const newShares: number = 100;

  before(async () => {
    context = await Context.init([], false, "alice", false);
    await context.setDexFactoryFunction(0, "initialize_exchange");
    await context.setDexFactoryFunction(4, "invest_liquidity");
    await context.setDexFactoryFunction(5, "divest_liquidity");
    await context.setDexFactoryFunction(6, "vote");
    await context.setDexFactoryFunction(7, "veto");
    await context.factory.setTokenFunction(0, "transfer");
    await context.factory.setTokenFunction(
      1,
      standard == "FA2" ? "update_operators" : "approve"
    );
    pairAddress = await context.createPair();
    tokenAddress = await context.pairs[0].contract.address;
  });

  function vetoSuccessCase(
    decription,
    sender,
    voter,
    vetor,
    candidate,
    vote,
    veto
  ) {
    it(decription, async function () {
      if (vote) {
        await context.updateActor(voter);
        const voterAddress = accounts[voter].pkh;
        await context.pairs[0].vote(voterAddress, candidate, vote);
      }
      await context.updateActor(sender);
      await context.pairs[0].updateStorage();
      const prevDelegated = context.pairs[0].storage.current_delegated;
      await context.pairs[0].updateStorage({
        ledger: [vetor],
        voters: [vetor],
        vetos: [prevDelegated],
      });
      const voterInitVoteInfo = context.pairs[0].storage.voters[vetor] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      const voterInitSharesInfo = context.pairs[0].storage.ledger[vetor] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      const voterInitCandidateVotes =
        context.pairs[0].storage.votes[candidate] || new BigNumber(0);
      const initVotes = context.pairs[0].storage.total_votes;
      const initVeto = context.pairs[0].storage.veto;
      const prevCurrentCandidate = context.pairs[0].storage.current_candidate;
      await context.pairs[0].veto(vetor, veto);
      await context.pairs[0].updateStorage({
        ledger: [vetor],
        voters: [vetor],
        vetos: [candidate, prevDelegated],
      });
      const voterFinalVoteInfo = context.pairs[0].storage.voters[vetor] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      const voterFinalSharesInfo = context.pairs[0].storage.ledger[vetor] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      const prevDelegateFinalVetos = context.pairs[0].storage.vetos[
        prevDelegated
      ]
        ? Date.parse(context.pairs[0].storage.vetos[prevDelegated]) / 1000
        : 0;
      const finalVeto = context.pairs[0].storage.veto;
      const finalCurrentCandidate = context.pairs[0].storage.current_candidate;
      const finalCurrentDelegated = context.pairs[0].storage.current_delegated;
      strictEqual(
        voterFinalSharesInfo.balance.toNumber(),
        voterInitSharesInfo.balance.plus(voterInitVoteInfo.veto).toNumber() -
          veto,
        "Tokens not removed"
      );
      strictEqual(
        voterFinalSharesInfo.frozen_balance.toNumber(),
        voterInitSharesInfo.frozen_balance
          .minus(voterInitVoteInfo.veto)
          .toNumber() + veto,
        "Tokens not frozen"
      );
      if (
        initVeto
          .minus(voterInitVoteInfo.veto)
          .plus(new BigNumber(veto))
          .gt(initVotes.div(new BigNumber(3)))
      ) {
        notStrictEqual(prevDelegateFinalVetos, 0, "Veto wasn't updated");
        strictEqual(finalVeto.toNumber(), 0, "Veto is wrong");
        strictEqual(finalCurrentCandidate, null, "Delegated wasn't updated");
        strictEqual(
          finalCurrentDelegated,
          prevCurrentCandidate == prevDelegated ? null : prevCurrentCandidate,
          "Delegated wasn't updated"
        );
      } else {
        strictEqual(prevDelegateFinalVetos, 0, "Veto was updated");
        strictEqual(
          finalCurrentCandidate,
          prevCurrentCandidate,
          "Delegated wasn't updated"
        );
        strictEqual(
          finalCurrentDelegated,
          prevDelegated,
          "Delegated wasn't updated"
        );
      }
      strictEqual(
        voterFinalVoteInfo.veto.toNumber(),
        veto,
        "User vote wasn't updated"
      );
    });
  }

  function vetoFailCase(decription, sender, vetor, value, errorMsg) {
    it(decription, async function () {
      await context.updateActor(sender);
      await rejects(
        context.pairs[0].veto(vetor, value),
        (err) => {
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });
  }

  describe.only("Test the user's veto power", () => {
    vetoSuccessCase(
      "success in case of enough liquid shares",
      "alice",
      "alice",
      aliceAddress,
      bobAddress,
      9000,
      500
    );
    vetoSuccessCase(
      "success in case of exactly equal to liquid balance",
      "alice",
      "alice",
      aliceAddress,
      carolAddress,
      1000,
      9000
    );
    vetoSuccessCase(
      "success in case of enough shaes after delegate removal",
      "alice",
      "alice",
      aliceAddress,
      bobAddress,
      1000,
      100
    );
    vetoSuccessCase(
      "success in case of 0 shares",
      "alice",
      "alice",
      aliceAddress,
      aliceAddress,
      0,
      0
    );
    vetoFailCase(
      "revert in case of more than liquid shares",
      "alice",
      aliceAddress,
      20000,
      "Dex/not-enough-balance"
    );
    vetoFailCase(
      "revert in case of no shares",
      "bob",
      bobAddress,
      0,
      "Dex/no-shares"
    );
  });

  describe.only("Test veto permissions", () => {
    before(async () => {
      await context.updateActor("alice");
      await context.pairs[0].approve(bobAddress, 5000);
    });
    vetoSuccessCase(
      "success in case of veto by the user",
      "alice",
      "alice",
      aliceAddress,
      bobAddress,
      3000,
      500
    );
    vetoSuccessCase(
      "success in case of veto be the approved user",
      "bob",
      "alice",
      aliceAddress,
      bobAddress,
      0,
      100
    );
    vetoFailCase(
      "revert in case of no shares",
      "carol",
      aliceAddress,
      100,
      "Dex/not-enough-allowance"
    );
  });

  it("should add veto and set none delegator", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // store prev balances
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);

    // veto
    await context.pairs[0].veto(aliceAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() - value,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() + value,
      "Tokens not frozen"
    );
    // 2. voter info updated
    notStrictEqual(
      aliceFinalVoteInfo.last_veto,
      aliceInitVoteInfo.last_veto,
      "User last veto time wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.veto.toNumber(),
      value,
      "User veto wasn't updated"
    );
    // 3. veto time set
    notStrictEqual(aliceFinalCandidateVeto, 0, "Delegate wasn't locked");

    // 4. global state updated
    strictEqual(0, finalVetos.toNumber(), "Total votes weren't updated");
    strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
  });

  if (process.env.npm_package_config_standard === "FA12") {
    it("should set veto by approved user", async function () {
      this.timeout(5000000);
      // reset pairs
      await context.flushPairs();
      await context.createPairs();

      // get gelegate address
      await context.updateActor("bob");
      let carolAddress = await tezos.signer.publicKeyHash();
      await context.updateActor();
      let delegate = carolAddress;
      let value = 500;
      let reward = 1000;

      // vote for the candidate
      let aliceAddress = await tezos.signer.publicKeyHash();
      await context.pairs[0].vote(aliceAddress, delegate, value);

      // update delegator
      await context.pairs[0].sendReward(reward);
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        voters: [aliceAddress],
        vetos: [delegate],
      });
      strictEqual(
        context.pairs[0].storage.current_delegated,
        delegate,
        "Delegator not set"
      );

      // approve tokens
      await context.updateActor("bob");
      let bobAddress = await tezos.signer.publicKeyHash();
      await context.updateActor();
      await context.pairs[0].approve(bobAddress, value);
      await context.updateActor("bob");

      // store prev balances
      let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
        last_veto: 0,
      };
      let aliceInitSharesInfo = context.pairs[0].storage.ledger[
        aliceAddress
      ] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      let aliceInitCandidateVeto =
        context.pairs[0].storage.vetos[delegate] || new BigNumber(0);

      // veto
      await context.pairs[0].veto(aliceAddress, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        voters: [aliceAddress],
        vetos: [delegate],
      });
      let aliceFinalVoteInfo = context.pairs[0].storage.voters[
        aliceAddress
      ] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
        last_veto: 0,
      };
      let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
        aliceAddress
      ] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      let aliceFinalCandidateVeto =
        context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
      let finalVetos = context.pairs[0].storage.veto;
      let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
      // 1. tokens frozen
      strictEqual(
        aliceFinalSharesInfo.balance.toNumber(),
        aliceInitSharesInfo.balance.toNumber() - value,
        "Tokens not removed"
      );
      strictEqual(
        aliceFinalSharesInfo.frozen_balance.toNumber(),
        aliceInitSharesInfo.frozen_balance.toNumber() + value,
        "Tokens not frozen"
      );
      // 2. voter info updated
      notStrictEqual(
        aliceFinalVoteInfo.last_veto,
        aliceInitVoteInfo.last_veto,
        "User last veto time wasn't updated"
      );
      strictEqual(
        aliceFinalVoteInfo.veto.toNumber(),
        value,
        "User vetj wasn't updated"
      );
      // 3. veto time set
      notStrictEqual(aliceFinalCandidateVeto, 0, "Delegate wasn't locked");

      // 4. global state updated
      strictEqual(0, finalVetos.toNumber(), "Total votes weren't updated");
      strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
    });
  }

  it("should remove veto", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // set veto that is not enough to replace delegator
    value = 10;
    await context.pairs[0].veto(aliceAddress, value);

    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });

    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);

    // remove veto votes
    await context.pairs[0].veto(aliceAddress, 0);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() + value,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() - value,
      "Tokens not frozen"
    );
    // 2. voter info updated
    notStrictEqual(
      aliceFinalVoteInfo.last_veto,
      aliceInitVoteInfo.last_veto,
      "User last veto time wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.veto.toNumber(),
      0,
      "User veto wasn't updated"
    );
    // 3. veto time set
    // strictEqual(
    //   aliceFinalCandidateVeto.toNumber(),
    //   0,
    //   "Delegate wasn't locked"
    // );
    // 4. global state updated
    strictEqual(0, finalVetos.toNumber(), "Total vetos weren't updated");
    strictEqual(finalCurrentDelegate, delegate, "Delegate updated");
  });

  it("should increment veto", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // set veto that is not enough to replace delegator
    value = 10;
    await context.pairs[0].veto(aliceAddress, value);

    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });

    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);

    // remove veto votes
    await context.pairs[0].veto(aliceAddress, value * 2);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber() + value,
      aliceInitSharesInfo.balance.toNumber(),
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() + value,
      "Tokens not frozen"
    );
    // 2. voter info updated
    notStrictEqual(
      aliceFinalVoteInfo.last_veto,
      aliceInitVoteInfo.last_veto,
      "User last veto time wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.veto.toNumber(),
      value * 2,
      "User veto wasn't updated"
    );
    // 3. veto time set
    // strictEqual(
    //   aliceFinalCandidateVeto.toNumber(),
    //   0,
    //   "Delegate wasn't locked"
    // );
    // 4. global state updated
    strictEqual(
      value * 2,
      finalVetos.toNumber(),
      "Total vetos weren't updated"
    );
    strictEqual(finalCurrentDelegate, delegate, "Delegate updated");
  });

  it("should replace delegator", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 200;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // approve tokens
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    await context.pairs[0].approve(bobAddress, value);
    await context.updateActor("bob");

    // veto
    await context.pairs[0].veto(aliceAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;

    strictEqual(0, finalVetos.toNumber(), "Total votes weren't updated");
    strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
  });

  it("should not replace delegator if it is None", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 200;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // veto
    await context.pairs[0].veto(aliceAddress, value);
    await context.pairs[0].veto(aliceAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;

    strictEqual(0, finalVetos.toNumber(), "Total votes weren't updated");
    strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
  });

  it("should set delegator to None if candidate and delegator are the same", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegated and real delegated doesn't match"
    );
    strictEqual(
      context.pairs[0].storage.current_candidate,
      null,
      "Candidate doesn't match"
    );

    // veto
    await context.pairs[0].veto(aliceAddress, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
    strictEqual(finalCurrentCandidate, null, "Candidate wasn't updated");
  });

  it("should set delegator to next candidate if candidate and delegator are different", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 100;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegated and real delegated doesn't match"
    );
    strictEqual(
      context.pairs[0].storage.current_candidate,
      null,
      "Candidate doesn't match"
    );

    // update candidate
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    let tezAmount = 1000;
    let tokenAmount = 100000;
    let newShares = 100;
    await context.updateActor();
    await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);

    await context.updateActor("bob");
    await context.pairs[0].investLiquidity(tokenAmount, tezAmount, newShares);

    await context.pairs[0].vote(
      bobAddress,
      aliceAddress,
      Math.floor(value / 2)
    );
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    notStrictEqual(
      context.pairs[0].storage.current_delegated,
      context.pairs[0].storage.current_candidate,
      "Delegator and candidate match"
    );
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegated doesn't match after voting"
    );
    strictEqual(
      aliceAddress,
      context.pairs[0].storage.current_candidate,
      "Current candidate wrong"
    );

    // veto
    await context.updateActor();
    await context.pairs[0].veto(aliceAddress, Math.floor(value / 2) + 1);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    strictEqual(
      context.pairs[0].storage.veto.toNumber(),
      0,
      "Total veto isn't updated"
    );
    strictEqual(finalCurrentDelegate, aliceAddress, "Delegate wasn't updated");
    strictEqual(finalCurrentCandidate, null, "Candidate was updated");
  });

  it("should withdraw veto if delegator was removed by veto", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // veto
    await context.pairs[0].veto(aliceAddress, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      0,
      context.pairs[0].storage.veto.toNumber(),
      "Total votes weren't updated"
    );

    // store prev balances
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);

    // checks
    await context.pairs[0].veto(aliceAddress, 0);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      last_veto: 0,
    };

    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };

    let aliceFinalCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.current_delegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() + value,
      "Tokens not unfrozen"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() - value,
      "Frozen tokens not removed"
    );
    // 2. voter info updated
    notStrictEqual(
      aliceFinalVoteInfo.last_veto,
      aliceInitVoteInfo.last_veto,
      "User last veto time wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.veto.toNumber(),
      0,
      "User vetj wasn't updated"
    );
    // 3. veto time set
    notStrictEqual(aliceFinalCandidateVeto, 0, "Delegate wasn't locked");

    // 4. global state updated
    strictEqual(0, finalVetos.toNumber(), "Total votes weren't updated");
    strictEqual(finalCurrentDelegate, null, "Delegate wasn't updated");
  });

  it("should revert veto without shares", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // change actor
    await context.updateActor("bob");
    let value = 500;
    let bobAddress = await tezos.signer.publicKeyHash();

    // veto
    await rejects(
      context.pairs[0].veto(bobAddress, value),
      (err) => {
        strictEqual(err.message, "Dex/no-shares", "Error message mismatch");
        return true;
      },
      "Veto should revert"
    );
  });

  it("should revert veto without enough shares", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 600;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.current_delegated,
      delegate,
      "Delegator not set"
    );

    // veto
    await rejects(
      context.pairs[0].veto(aliceAddress, value),
      (err) => {
        strictEqual(
          err.message,
          "Dex/not-enough-balance",
          "Error message mismatch"
        );
        return true;
      },
      "Vote should revert"
    );
  });

  it("should revert veto without allowance", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let value = 200;

    // veto
    await context.updateActor("bob");
    await rejects(
      context.pairs[0].veto(aliceAddress, value),
      (err) => {
        strictEqual(
          err.message,
          "Dex/not-enough-allowance",
          "Error message mismatch"
        );
        return true;
      },
      "Vote should revert"
    );
  });
});
