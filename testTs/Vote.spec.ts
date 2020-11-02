import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract("Vote()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should vote and set first candidate", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("bob");
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let delegate = carolAddress;
    let value = 500;

    // store prev balances
    let aliceAddress = await Tezos.signer.publicKeyHash();
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
      value,
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
    strictEqual(finalCurrentCandidate, null, "Candidate shoudn't be updated");
    strictEqual(finalCurrentDelegated, delegate, "Delegated wasn't updated");
  });

  it("should vote and replace candidate ", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get addresses
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();
    let aliceAddress = await Tezos.signer.publicKeyHash();

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
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let delegate = carolAddress;
    let initValue = 500;
    let aliceAddress = await Tezos.signer.publicKeyHash();

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
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();

    let delegate = carolAddress;
    let value = 500;

    // store prev balances
    let aliceAddress = await Tezos.signer.publicKeyHash();
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
      delegate,
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

  it("should allow to vote and set candidate by approved user", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    let aliceAddress = await Tezos.signer.publicKeyHash();

    // get gelegate address
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
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

  it("should update current candidate", async function () {
    this.timeout(5000000);

    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get addresses
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
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
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("bob");
    let bobAddress = await Tezos.signer.publicKeyHash();
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

  it("should fail voting without shares", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor("carol");
    let carolAddress = await Tezos.signer.publicKeyHash();

    let delegate = aliceAddress;
    let value = 500;

    // vote
    await rejects(
      context.pairs[0].vote(carolAddress, delegate, value),
      (err) => {
        strictEqual(err.message, "Dex/no-shares", "Error message mismatch");
        return true;
      },
      "Vote should fail"
    );
  });

  it("should fail voting for veto candidate", async function () {});

  it("should fail voting with shares exeeded liquid balance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await Tezos.signer.publicKeyHash();

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
      "Vote should fail"
    );
  });

  it("should fail voting with shares exeeded liquid & frozen balance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await Tezos.signer.publicKeyHash();

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
      "Vote should fail"
    );
  });

  it("should fail voting with low allowance", async function () {
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    let aliceAddress = await Tezos.signer.publicKeyHash();
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
      "Vote should fail"
    );
  });
});
