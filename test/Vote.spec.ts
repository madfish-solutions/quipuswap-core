import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

contract.only("Vote()", function () {
  let context: Context;
  let tokenAddress: string;
  let pairAddress: string;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const carolAddress: string = accounts.carol.pkh;

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

      strictEqual(
        voterFinalSharesInfo.balance.toNumber(),
        voterInitSharesInfo.balance.plus(voterInitVoteInfo.vote).toNumber() -
          value
      );
      strictEqual(
        voterFinalSharesInfo.frozen_balance.toNumber(),
        voterInitSharesInfo.frozen_balance
          .minus(voterInitVoteInfo.vote)
          .toNumber() + value
      );
      strictEqual(voterFinalVoteInfo.candidate, value ? candidate : null);
      strictEqual(voterFinalVoteInfo.vote.toNumber(), value);

      if (value) {
        if (voterInitVoteInfo.candidate == candidate) {
          strictEqual(
            voterFinalCandidateVotes.toNumber(),
            voterInitCandidateVotes.minus(voterInitVoteInfo.vote).toNumber() +
              value
          );
        } else {
          strictEqual(
            voterFinalCandidateVotes.toNumber(),
            voterInitCandidateVotes.toNumber() + value
          );
        }
      }
      strictEqual(
        initVotes.minus(voterInitVoteInfo.vote).toNumber() + value,
        finalVotes.toNumber()
      );
      if (value > prevDelegateFinalCandidateVotes.toNumber())
        strictEqual(finalCurrentDelegated, candidate);
    });
  }

  function voteFailCase(decription, sender, voter, candidate, value, errorMsg) {
    it(decription, async function () {
      await context.updateActor(sender);
      await rejects(context.pairs[0].vote(voter, candidate, value), (err) => {
        ok(err.message == errorMsg, "Error message mismatch");
        return true;
      });
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

  describe("Test different candidates", () => {
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
      "(permanent) proto.008-PtEdo2Zk.contract.manager.unregistered_delegate"
    );
    voteFailCase(
      "revert in case of voting for unregistered candidate with power that makes him delegate",
      "alice",
      aliceAddress,
      "tz1gaRjULm9qy4D83VCvb4ABWLKpz4XXfqjx",
      5000,
      "(permanent) proto.008-PtEdo2Zk.contract.manager.unregistered_delegate"
    );

    describe("", async function () {
      before(async function () {
        await context.updateActor("bob");
        await context.pairs[0].vote(bobAddress, carolAddress, 2000);
        await context.updateActor("alice");
        await context.pairs[0].veto(aliceAddress, 2000);
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

  describe("Test candidate replacement", () => {
    before(async () => {
      await context.updateActor("alice");
      await context.flushPairs();
      pairAddress = await context.createPair();
      tokenAddress = await context.pairs[0].contract.address;
      await context.pairs[0].transfer(aliceAddress, bobAddress, 5000);
    });
    voteSuccessCase(
      "success in case of voting for new candidate if there if no delegate",
      "alice",
      aliceAddress,
      aliceAddress,
      1000
    );
    voteSuccessCase(
      "success in case of voting for new candidate if there is delegate with lower votes",
      "bob",
      bobAddress,
      bobAddress,
      4000
    );
    voteSuccessCase(
      "success in case of voting for new candidate if there if delegate wit higher votes",
      "alice",
      aliceAddress,
      aliceAddress,
      1000
    );
    voteSuccessCase(
      "success in case of voting for new candidate if there is delegate with the same votes",
      "alice",
      aliceAddress,
      carolAddress,
      4000
    );
    voteSuccessCase(
      "success in case of removing votes for delegate",
      "bob",
      bobAddress,
      bobAddress,
      2000
    );
    voteSuccessCase(
      "success in case of voting for the delegate",
      "alice",
      aliceAddress,
      bobAddress,
      4300
    );
  });
});
