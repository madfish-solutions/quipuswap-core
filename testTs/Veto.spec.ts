import { Context } from "./contracManagers/context";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import { Tezos, TezosOperationError } from "@taquito/taquito";

contract.only("Veto()", function () {
  let context: Context;

  before(async () => {
    context = await Context.init([]);
  });

  it("should add veto and set none delegator", async function () {
    this.timeout(5000000);
    // reset pairs
    await context.flushPairs();
    await context.createPairs();

    // get gelegate address
    await context.updateActor("../../fixtures/key1");
    let carolAddress = await Tezos.signer.publicKeyHash();
    await context.updateActor();
    let delegate = carolAddress;
    let value = 500;
    let reward = 1000;

    // vote for the candidate
    let aliceAddress = await Tezos.signer.publicKeyHash();
    await context.pairs[0].vote(aliceAddress, delegate, value);

    // update delegator
    await context.pairs[0].sendReward(reward);
    await context.pairs[0].updateStorage({
      ledger: [aliceAddress],
      voters: [aliceAddress],
      vetos: [delegate],
    });
    strictEqual(
      context.pairs[0].storage.currentDelegated,
      delegate,
      "Delegator not set"
    );

    // store prev balances
    let aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
      candidate: undefined,
      vote: new BigNumber(0),
      veto: new BigNumber(0),
      lastVeto: 0,
    };
    let aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
      balance: new BigNumber(0),
      frozenBalance: new BigNumber(0),
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
      lastVeto: 0,
    };
    let aliceFinalSharesInfo = context.pairs[0].storage.ledger[
      aliceAddress
    ] || {
      balance: new BigNumber(0),
      frozenBalance: new BigNumber(0),
      allowances: {},
    };
    let aliceFinalCandidateVeto =
      context.pairs[0].storage.vetos[delegate] || new BigNumber(0);
    let finalVetos = context.pairs[0].storage.veto;
    let finalCurrentDelegate = context.pairs[0].storage.currentDelegated;
    // 1. tokens frozen
    strictEqual(
      aliceFinalSharesInfo.balance.toNumber(),
      aliceInitSharesInfo.balance.toNumber() - value,
      "Tokens not removed"
    );
    strictEqual(
      aliceFinalSharesInfo.frozenBalance.toNumber(),
      aliceInitSharesInfo.frozenBalance.toNumber() + value,
      "Tokens not frozen"
    );
    // 2. voter info updated
    notStrictEqual(
      aliceFinalVoteInfo.lastVeto,
      aliceInitVoteInfo.lastVeto,
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
