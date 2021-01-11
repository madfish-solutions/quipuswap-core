import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
const standard = process.env.npm_package_config_standard;

contract.only("Vote()", function () {
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

  function voteSuccessCase(decription, sender, voter, candidate, value) {
    it(decription, async function () {
      await context.updateActor(sender);
      const senderAddress: string = accounts[sender].pkh;
      await context.pairs[0].updateStorage({
        ledger: [senderAddress, voter],
        voters: [senderAddress, voter],
        votes: [candidate],
      });
      const voterInitVoteInfo = context.pairs[0].storage.voters[voter] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      const voterInitSharesInfo = context.pairs[0].storage.ledger[voter] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      const voterInitCandidateVotes =
        context.pairs[0].storage.votes[candidate] || new BigNumber(0);
      const initVotes = context.pairs[0].storage.total_votes;
      await context.pairs[0].vote(voter, candidate, value);
      const prevDelegated = context.pairs[0].storage.current_delegated;
      await context.pairs[0].updateStorage({
        ledger: [senderAddress, voter],
        voters: [senderAddress, voter],
        votes: [candidate, prevDelegated],
      });

      const voterFinalVoteInfo = context.pairs[0].storage.voters[voter] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      const voterFinalSharesInfo = context.pairs[0].storage.ledger[voter] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      const prevDelegateFinalCandidateVotes =
        context.pairs[0].storage.votes[prevDelegated] || new BigNumber(0);
      const voterFinalCandidateVotes =
        context.pairs[0].storage.votes[candidate] || new BigNumber(0);
      const finalVotes = context.pairs[0].storage.total_votes;
      const finalCurrentCandidate = context.pairs[0].storage.current_candidate;
      const finalCurrentDelegated = context.pairs[0].storage.current_delegated;

      // check:
      // 1. voter balance
      // 2. voter frozen balance
      // 3. voter candidate
      // 4. voter vote
      // 5. candidate votes
      // 6. current delegated
      // 7. current candidate
      // 8. total votes

      strictEqual(
        voterFinalSharesInfo.balance.toNumber(),
        voterInitSharesInfo.balance.plus(voterInitVoteInfo.vote).toNumber() -
          value,
        "Tokens not removed"
      );
      strictEqual(
        voterFinalSharesInfo.frozen_balance.toNumber(),
        voterInitSharesInfo.frozen_balance
          .minus(voterInitVoteInfo.vote)
          .toNumber() + value,
        "Tokens not frozen"
      );
      strictEqual(
        voterFinalVoteInfo.candidate,
        value ? candidate : null,
        "User candidate wasn't updated"
      );
      strictEqual(
        voterFinalVoteInfo.vote.toNumber(),
        value,
        "User vote wasn't updated"
      );

      if (value) {
        if (voterInitVoteInfo.candidate == candidate) {
          strictEqual(
            voterFinalCandidateVotes.toNumber(),
            voterInitCandidateVotes.minus(voterInitVoteInfo.vote).toNumber() +
              value,
            "Candidate didn't receive tokens"
          );
        } else {
          strictEqual(
            voterFinalCandidateVotes.toNumber(),
            voterInitCandidateVotes.toNumber() + value,
            "Candidate didn't receive tokens"
          );
        }
      }
      strictEqual(
        initVotes.minus(voterInitVoteInfo.vote).toNumber() + value,
        finalVotes.toNumber(),
        "Total votes weren't updated"
      );
      if (value > prevDelegateFinalCandidateVotes.toNumber())
        strictEqual(
          finalCurrentDelegated,
          candidate,
          "Delegated wasn't updated"
        );
    });
  }

  function voteFailCase(decription, sender, voter, candidate, value, errorMsg) {
    it(decription, async function () {
      await context.updateActor(sender);
      await rejects(
        context.pairs[0].vote(voter, candidate, value),
        (err) => {
          console.log(err.message);
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        },
        "Investment should revert"
      );
    });
  }

  describe("Test the user's vote power", () => {
    voteSuccessCase(
      "success in case of enough liquid shares",
      "alice",
      aliceAddress,
      aliceAddress,
      1000
    );
    voteSuccessCase(
      "success in case of exactly equal to liquid balance",
      "alice",
      aliceAddress,
      aliceAddress,
      10000
    );
    voteSuccessCase(
      "success in case of enough liquid shares for revoting",
      "alice",
      aliceAddress,
      bobAddress,
      1000
    );
    voteSuccessCase(
      "success in case of enough liquid shares for revoting",
      "alice",
      aliceAddress,
      bobAddress,
      0
    );
    voteSuccessCase(
      "success in case of 0 shares with no candidate",
      "alice",
      aliceAddress,
      bobAddress,
      0
    );
    voteFailCase(
      "revert in case of more than liquid shares",
      "alice",
      aliceAddress,
      aliceAddress,
      20000,
      "Dex/not-enough-balance"
    );
    voteFailCase(
      "revert in case of no shares",
      "bob",
      bobAddress,
      bobAddress,
      0,
      "Dex/no-shares"
    );
  });

  describe("Test voting permissions", () => {
    before(async () => {
      await context.updateActor("alice");
      await context.pairs[0].approve(bobAddress, 5000);
    });
    voteFailCase(
      "revert in case of voting by the unapproved user",
      "alice",
      bobAddress,
      bobAddress,
      0,
      "Dex/no-shares"
    );
    voteSuccessCase(
      "success in case of vote by user",
      "alice",
      aliceAddress,
      aliceAddress,
      1000
    );
    voteSuccessCase(
      "success in case of vote by approved user",
      "bob",
      aliceAddress,
      bobAddress,
      5000
    );
  });

  describe.only("Test different candidates", () => {
    before(async () => {
      await context.updateActor("alice");
      await context.pairs[0].transfer(aliceAddress, bobAddress, 5000);
    });
    voteSuccessCase(
      "success in case of voting for new candidate",
      "alice",
      aliceAddress,
      aliceAddress,
      1000
    );
    voteSuccessCase(
      "success in case of voting for candidate with votes",
      "bob",
      bobAddress,
      bobAddress,
      4000
    );
    voteFailCase(
      "revert in case of voting for unregistered candidate with power that won't makes him delegate",
      "alice",
      aliceAddress,
      "tz1gaRjULm9qy4D83VCvb4ABWLKpz4XXfqjx",
      1000,
      "(permanent) proto.007-PsDELPH1.contract.manager.unregistered_delegate"
    );
    voteFailCase(
      "revert in case of voting for unregistered candidate with power that makes him delegate",
      "alice",
      aliceAddress,
      "tz1gaRjULm9qy4D83VCvb4ABWLKpz4XXfqjx",
      5000,
      "(permanent) proto.007-PsDELPH1.contract.manager.unregistered_delegate"
    );

    describe("", async function () {
      before(async function () {
        await context.pairs[0].vote(aliceAddress, carolAddress, 5000);
        await context.pairs[0].veto(aliceAddress, 5000);
      });
      voteFailCase(
        "revert in case of voting for banned candidate",
        "bob",
        bobAddress,
        carolAddress,
        3000,
        "Dex/veto-candidate"
      );
    });
  });

  it("should vote and replace candidate ", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get addresses
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();
    let aliceAddress = await tezos.signer.publicKeyHash();

    let delegate = bobAddress;
    let initValue = 500;

    // vote for first time
    await context.pairs[0].vote(aliceAddress, delegate, initValue);

    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let initVotes = context.pairs[0].storage.total_votes;

    // vote
    let prevDelegated = delegate;
    delegate = carolAddress;
    let value = 200;
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let finalVotes = context.pairs[0].storage.total_votes;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    let finalCurrentDelegated = context.pairs[0].storage.current_delegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() + initValue - value,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() - initValue + value,
      "Tokens not frozen"
    );

    // 2. voter info updated
    strictEqual(
      aliceFinalVoteInfo.candidate,
      delegate,
      "User candidate wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.vote.toNumber(),
      aliceInitVoteInfo.vote.toNumber() - initValue + value,
      "User vote wasn't updated"
    );

    // 3. votes added
    strictEqual(
      aliceFinalCandidateVotes.toNumber(),
      value,
      "Candidate didn't receive tokens"
    );

    // 4. global state updated
    strictEqual(
      initVotes.toNumber() - initValue + value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
    strictEqual(finalCurrentDelegated, delegate, "Delegated wasn't updated");
    strictEqual(
      finalCurrentCandidate,
      prevDelegated,
      "Candidate shoudn't be updated"
    );
  });

  it("should vote for the same candidate", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let delegate = carolAddress;
    let initValue = 500;
    let aliceAddress = await tezos.signer.publicKeyHash();

    // vote for the first time
    await context.pairs[0].vote(aliceAddress, delegate, initValue);

    let value = 100;

    // store prev balances
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let initVotes = context.pairs[0].storage.total_votes;

    // vote
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let finalVotes = context.pairs[0].storage.total_votes;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;

    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() - value + initValue,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      aliceInitSharesInfo.frozen_balance.toNumber() + value - initValue,
      "Tokens not frozen"
    );

    // 2. voter info updated
    strictEqual(
      aliceFinalVoteInfo.candidate,
      delegate,
      "User candidate wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.vote.toNumber(),
      value,
      "User vote wasn't updated"
    );

    // 3. votes added
    strictEqual(
      aliceFinalCandidateVotes.toNumber(),
      aliceInitCandidateVotes.toNumber() + value - initValue,
      "Candidate didn't receive tokens"
    );

    // 4. global state updated
    strictEqual(
      initVotes.toNumber() + value - initValue,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
    strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
  });

  it("should vote for None candidate ", async function () {
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

    // store prev balances
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceInitCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let initVotes = context.pairs[0].storage.total_votes;
    let initCurrentCandidate = context.pairs[0].storage.current_candidate;
    let initCurrentDelegated = context.pairs[0].storage.current_delegated;

    // vote
    await context.pairs[0].vote(aliceAddress, delegate, 0);

    // checks
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      votes: [delegate],
    });
    let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozen_balance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVotes =
      context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    let finalVotes = context.pairs[0].storage.total_votes;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    let finalCurrentDelegated = context.pairs[0].storage.current_delegated;

    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() + value,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozen_balance.toNumber(),
      0,
      "Tokens not frozen"
    );

    // 2. voter info updated
    strictEqual(
      aliceFinalVoteInfo.candidate,
      null,
      "User candidate wasn't updated"
    );
    strictEqual(
      aliceFinalVoteInfo.vote.toNumber(),
      0,
      "User vote wasn't updated"
    );

    // 3. votes added
    strictEqual(
      aliceFinalCandidateVotes.toNumber(),
      aliceInitCandidateVotes.toNumber() - value,
      "Candidate didn't receive tokens"
    );

    // 4. global state updated
    strictEqual(
      initVotes.toNumber() - value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );

    strictEqual(
      finalCurrentDelegated,
      initCurrentDelegated,
      "Delegated was updated"
    );
  });

  if (process.env.npm_package_config_standard === "FA12") {
    it("should allow to vote and set candidate by approved user", async function () {
      this.timeout(5000000);

      // reset pairs
      await context.flushPairs();
      await context.createPairs();

      let aliceAddress = await tezos.signer.publicKeyHash();

      // get gelegate address
      await context.updateActor("bob");
      let bobAddress = await tezos.signer.publicKeyHash();
      await context.updateActor();

      // approve tokens
      let value = 500;
      await context.pairs[0].approve(bobAddress, value);
      await context.updateActor("bob");

      let delegate = bobAddress;

      // store prev balances
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        voters: [aliceAddress],
        votes: [delegate],
      });
      let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      let aliceInitSharesInfo = context.pairs[0].storage.ledger[
        aliceAddress
      ] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      let aliceInitCandidateVotes =
        context.pairs[0].storage.votes[delegate] || new BigNumber(0);
      let initVotes = context.pairs[0].storage.total_votes;

      // vote
      await context.pairs[0].vote(aliceAddress, delegate, value);

      // checks
      await context.pairs[0].updateStorage({
        ledger: [aliceAddress],
        voters: [aliceAddress],
        votes: [delegate],
      });
      let aliceFinalVoteInfo = context.pairs[0].storage.voters[
        aliceAddress
      ] || {
        candidate: undefined,
        vote: new BigNumber(0),
        veto: new BigNumber(0),
      };
      let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
        aliceAddress
      ] || {
        balance: new BigNumber(0),
        frozen_balance: new BigNumber(0),
        allowances: {},
      };
      let aliceFinalCandidateVotes =
        context.pairs[0].storage.votes[delegate] || new BigNumber(0);
      let finalVotes = context.pairs[0].storage.total_votes;
      let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
      let finalCurrentDelegated = context.pairs[0].storage.current_delegated;

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
      strictEqual(
        aliceFinalVoteInfo.candidate,
        delegate,
        "User candidate wasn't updated"
      );
      strictEqual(
        aliceFinalVoteInfo.vote.toNumber(),
        aliceInitVoteInfo.vote.toNumber() + value,
        "User vote wasn't updated"
      );

      // 3. votes added
      strictEqual(
        aliceFinalCandidateVotes.toNumber(),
        aliceInitCandidateVotes.toNumber() + value,
        "Candidate didn't receive tokens"
      );

      // 4. global state updated
      strictEqual(
        initVotes.toNumber() + value,
        finalVotes.toNumber(),
        "Total votes weren't updated"
      );

      strictEqual(finalCurrentDelegated, delegate, "Delegated wasn't updated");
      strictEqual(finalCurrentCandidate, null, "Candidate wasn't updated");
    });
  }
  it("should update current candidate", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get addresses
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 500;
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    let aliceDelegate = carolAddress;
    let bobDelegate = bobAddress;
    value = 200;

    // store prev balances
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });
    let aliceInitCandidateVotes =
      context.pairs[0].storage.votes[aliceDelegate] || new BigNumber(0);
    let bobInitCandidateVotes =
      context.pairs[0].storage.votes[bobDelegate] || new BigNumber(0);
    let initVotes = context.pairs[0].storage.total_votes;

    // vote
    await context.pairs[0].vote(aliceAddress, aliceDelegate, value);

    // checks
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });

    let aliceFinalCandidateVotes =
      context.pairs[0].storage.votes[aliceDelegate] || new BigNumber(0);
    let finalVotes = context.pairs[0].storage.total_votes;
    let initCurrentCandidate = context.pairs[0].storage.current_candidate;
    let initCurrentDelegated = context.pairs[0].storage.current_delegated;

    // check global state
    strictEqual(
      aliceInitCandidateVotes.toNumber() + value,
      aliceFinalCandidateVotes.toNumber(),
      "Tokens not voted"
    );
    strictEqual(initCurrentCandidate, null, "Candidate shouldn't be updated");
    strictEqual(initCurrentDelegated, aliceDelegate, "Delegated not updated");
    strictEqual(
      initVotes.toNumber() + value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
    initVotes = finalVotes;

    // vote from Bob
    value = 500;
    await context.updateActor("bob");
    await context.pairs[0].vote(bobAddress, bobDelegate, value);

    // checks
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });
    let bobFinalCandidateVotes =
      context.pairs[0].storage.votes[bobDelegate] || new BigNumber(0);
    finalVotes = context.pairs[0].storage.total_votes;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    let finalCurrentDelegated = context.pairs[0].storage.current_delegated;

    // check global state
    strictEqual(
      bobInitCandidateVotes.toNumber() + value,
      bobFinalCandidateVotes.toNumber(),
      "Tokens not voted"
    );
    strictEqual(finalCurrentCandidate, aliceDelegate, "Candidate not updated");
    strictEqual(finalCurrentDelegated, bobDelegate, "Delegated not updated");
    strictEqual(
      initVotes.toNumber() + value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
  });

  it("should not update current candidate", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get addresses
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let bobAddress = await tezos.signer.publicKeyHash();
    await context.updateActor();

    let value = 500;
    await context.pairs[0].transfer(aliceAddress, bobAddress, value);

    let aliceDelegate = carolAddress;
    let bobDelegate = bobAddress;
    value = 200;

    // store prev balances
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });
    let aliceInitCandidateVotes =
      context.pairs[0].storage.votes[aliceDelegate] || new BigNumber(0);
    let bobInitCandidateVotes =
      context.pairs[0].storage.votes[bobDelegate] || new BigNumber(0);
    let initVotes = context.pairs[0].storage.total_votes;

    // vote
    await context.pairs[0].vote(aliceAddress, aliceDelegate, value);

    // checks
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });

    let aliceFinalCandidateVotes =
      context.pairs[0].storage.votes[aliceDelegate] || new BigNumber(0);
    let finalVotes = context.pairs[0].storage.total_votes;
    let initCurrentCandidate = context.pairs[0].storage.current_candidate;
    let initCurrentDelegated = context.pairs[0].storage.current_delegated;

    // check global state
    strictEqual(
      aliceInitCandidateVotes.toNumber() + value,
      aliceFinalCandidateVotes.toNumber(),
      "Tokens not voted"
    );
    strictEqual(initCurrentCandidate, null, "Candidate shouldn't be updated");
    strictEqual(initCurrentDelegated, aliceDelegate, "Delegated not updated");
    strictEqual(
      initVotes.toNumber() + value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
    initVotes = finalVotes;

    // vote from Bob
    value = 100;
    await context.updateActor("bob");
    await context.pairs[0].vote(bobAddress, bobDelegate, value);

    // checks
    await context.pairs[0].updateStorage({
      votes: [aliceDelegate, bobDelegate],
    });
    let bobFinalCandidateVotes =
      context.pairs[0].storage.votes[bobDelegate] || new BigNumber(0);
    finalVotes = context.pairs[0].storage.total_votes;
    let finalCurrentCandidate = context.pairs[0].storage.current_candidate;
    let finalCurrentDelegated = context.pairs[0].storage.current_delegated;

    // check global state
    strictEqual(
      bobInitCandidateVotes.toNumber() + value,
      bobFinalCandidateVotes.toNumber(),
      "Tokens not voted"
    );
    strictEqual(finalCurrentCandidate, bobDelegate, "Candidate not updated");
    strictEqual(finalCurrentDelegated, aliceDelegate, "Delegated not updated");
    strictEqual(
      initVotes.toNumber() + value,
      finalVotes.toNumber(),
      "Total votes weren't updated"
    );
  });

  it("should revert voting without shares", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await tezos.signer.publicKeyHash();

    let delegate = aliceAddress;
    let value = 500;

    // vote
    await rejects(
      context.pairs[0].vote(carolAddress, delegate, value),
      (err) => {
        strictEqual(err.message, "Dex/no-shares", "Error message mismatch");
        return true;
      },
      "Vote should revert"
    );
  });

  it("should revert voting for veto candidate", async function () {});

  it("should revert voting with shares exeeded liquid balance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await tezos.signer.publicKeyHash();

    let delegate = aliceAddress;
    let value = 5000;

    // vote
    await rejects(
      context.pairs[0].vote(aliceAddress, delegate, value),
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

  it("should revert voting with shares exeeded liquid & frozen balance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await tezos.signer.publicKeyHash();

    let delegate = aliceAddress;

    let value = 1000;
    await context.pairs[0].vote(aliceAddress, delegate, value);
    value = 1001;

    // vote
    await rejects(
      context.pairs[0].vote(aliceAddress, delegate, value),
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

  it("should revert voting with low allowance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await tezos.signer.publicKeyHash();
    await context.updateActor("carol");

    let delegate = aliceAddress;
    let value = 500;

    // vote
    await rejects(
      context.pairs[0].vote(aliceAddress, delegate, value),
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
