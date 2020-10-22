import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract("Veto()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should add veto and set none delegator", async function () {
    // this.timeout(5000000);
    // // reset pairs
    // await context.flushPairs();
    // await context.createPairs();
    // // get gelegate address
    // await context.updateActor("../../fixtures/key1");
    // let carolAddress = await Tezos.signer.publicKeyHash();
    // await context.updateActor();
    // let delegate = carolAddress;
    // let value = 500;
    // // store prev balances
    // let aliceAddress = await Tezos.signer.publicKeyHash();
    // await context.pairs[0].updateStorage({
    //   ledger: [aliceAddress],
    //   voters: [aliceAddress],
    //   votes: [delegate],
    // });
    // let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
    //   candidate: undefined,
    //   vote: new BigNumber(0),
    //   veto: new BigNumber(0),
    // };
    // let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
    //   balance: new BigNumber(0),
    //   frozenBalance: new BigNumber(0),
    //   allowances: {},
    // };
    // let aliceInitCandidateVotes =
    //   context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    // let initVotes = context.pairs[0].storage.totalVotes;
    // // vote
    // await context.pairs[0].vote(aliceAddress, delegate, value);
    // // checks
    // await context.pairs[0].updateStorage({
    //   ledger: [aliceAddress],
    //   voters: [aliceAddress],
    //   votes: [delegate],
    // });
    // let aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
    //   candidate: undefined,
    //   vote: new BigNumber(0),
    //   veto: new BigNumber(0),
    // };
    // let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
    //   aliceAddress
    // ] || {
    //   balance: new BigNumber(0),
    //   frozenBalance: new BigNumber(0),
    //   allowances: {},
    // };
    // let aliceFinalCandidateVotes =
    //   context.pairs[0].storage.votes[delegate] || new BigNumber(0);
    // let finalVotes = context.pairs[0].storage.totalVotes;
    // let finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
    // // 1. tokens frozen
    // strictEqual(
    //   aliceFinalSharesInfo.balance.toNumber(),
    //   aliceInitSharesInfo.balance.toNumber() - value,
    //   "Tokens not removed"
    // );
    // strictEqual(
    //   aliceFinalSharesInfo.frozenBalance.toNumber(),
    //   aliceInitSharesInfo.frozenBalance.toNumber() + value,
    //   "Tokens not frozen"
    // );
    // // 2. voter info updated
    // strictEqual(
    //   aliceFinalVoteInfo.candidate,
    //   delegate,
    //   "User candidate wasn't updated"
    // );
    // strictEqual(
    //   aliceFinalVoteInfo.vote.toNumber(),
    //   value,
    //   "User vote wasn't updated"
    // );
    // // 3. votes added
    // strictEqual(
    //   aliceFinalCandidateVotes.toNumber(),
    //   aliceInitCandidateVotes.toNumber() + value,
    //   "Candidate didn't receive tokens"
    // );
    // // 4. global state updated
    // strictEqual(
    //   initVotes.toNumber() + value,
    //   finalVotes.toNumber(),
    //   "Total votes weren't updated"
    // );
    // strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
  });

  it("should set veto by approved user", async function () {});
  it("should remove veto", async function () {});
  it("should increment veto", async function () {});
  it("should replace delegator", async function () {});
  it("should not replace delegator", async function () {});
  it("should set delegator to None if candidate and delegator are the same", async function () {});
  it("should withdraw veto if delegator was removed by veto", async function () {});
  it("should fail veto without shares", async function () {});
  it("should fail veto without enough shares", async function () {});
  it("should fail veto without allowance", async function () {});
});
