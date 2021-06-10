import { Context } from "./helpers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
const standard = process.env.EXCHANGE_TOKEN_STANDARD;

if (standard !== "MIXED") {
  contract("Veto()", function () {
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
        const finalCurrentCandidate =
          context.pairs[0].storage.current_candidate;
        const finalCurrentDelegated =
          context.pairs[0].storage.current_delegated;
        strictEqual(
          voterFinalSharesInfo.balance.toNumber(),
          voterInitSharesInfo.balance.plus(voterInitVoteInfo.veto).toNumber() -
            veto
        );
        strictEqual(
          voterFinalSharesInfo.frozen_balance.toNumber(),
          voterInitSharesInfo.frozen_balance
            .minus(voterInitVoteInfo.veto)
            .toNumber() + veto
        );
        if (
          initVeto
            .minus(voterInitVoteInfo.veto)
            .plus(new BigNumber(veto))
            .gt(initVotes.div(new BigNumber(3)))
        ) {
          notStrictEqual(prevDelegateFinalVetos, 0);
          strictEqual(finalVeto.toNumber(), 0);
          strictEqual(finalCurrentCandidate, null);
          strictEqual(
            finalCurrentDelegated,
            prevCurrentCandidate == prevDelegated ? null : prevCurrentCandidate
          );
        } else {
          strictEqual(prevDelegateFinalVetos, 0);
          strictEqual(finalCurrentCandidate, prevCurrentCandidate);
          strictEqual(finalCurrentDelegated, prevDelegated);
        }
        strictEqual(voterFinalVoteInfo.veto.toNumber(), veto);
      });
    }

    function vetoFailCase(decription, sender, vetor, value, errorMsg) {
      it(decription, async function () {
        await context.updateActor(sender);
        await rejects(context.pairs[0].veto(vetor, value), (err) => {
          ok(err.message == errorMsg, "Error message mismatch");
          return true;
        });
      });
    }

    describe("Test the user's veto power", () => {
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

    describe("Test veto permissions", () => {
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
        "revert in case of not approved user",
        "carol",
        aliceAddress,
        100,
        "Dex/not-enough-allowance"
      );
    });

    describe("Test different delegates", () => {
      vetoSuccessCase(
        "success in case of veto against delegate",
        "alice",
        "alice",
        aliceAddress,
        bobAddress,
        1000,
        4000
      );
      vetoSuccessCase(
        "success in case of veto against no delegate",
        "alice",
        "alice",
        aliceAddress,
        bobAddress,
        0,
        4000
      );
    });

    describe("Test the veto limit", () => {
      vetoSuccessCase(
        "success in case of too little votes for veto",
        "alice",
        "alice",
        aliceAddress,
        aliceAddress,
        3000,
        10
      );
      vetoSuccessCase(
        "success in case of exctly 1/3 of votes",
        "alice",
        "alice",
        aliceAddress,
        aliceAddress,
        3000,
        1000
      );
      vetoSuccessCase(
        "success in case of enough votes for veto",
        "alice",
        "alice",
        aliceAddress,
        aliceAddress,
        3000,
        2000
      );
    });
  });
}
