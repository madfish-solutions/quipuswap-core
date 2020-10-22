// import { Context } from "./contracManagers/context";
// import { strictEqual, ok, notStrictEqual, rejects } from "assert";
// import BigNumber from "bignumber.js";
// import { TezosOperationError } from "@taquito/taquito";
// import { calculateFee } from "./contracManagers/utils";

// contract("TokenToTezSwap()", function () {
//   it("should exchnge token to tez and update dex state", async function () {
//     this.timeout(5000000);
//     // create context with exchange
//     let context = await Context.init();

//     let tokenAmount = 1000;
//     let minTezOut = 10;

//     let pairAddress = context.pairs[0].contract.address;
//     let aliceAddress = await context.tezos.signer.publicKeyHash();

//     // update keys
//     await context.updateActor("../../fixtures/key1");
//     let bobAddress = await context.tezos.signer.publicKeyHash();
//     await context.updateActor();

//     // send tokens to bob
//     await context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount);
//     await context.updateActor("../../fixtures/key1");

//     // check initial balance
//     let bobInitTezBalance = await context.tezos.tz.getBalance(bobAddress);
//     await context.tokens[0].updateStorage({ ledger: [bobAddress] });
//     let bobInitTokenLedger = await context.tokens[0].storage.ledger[bobAddress];
//     let bobInitTokenBalance = bobInitTokenLedger
//       ? bobInitTokenLedger.balance
//       : new BigNumber(0);

//     // swap tokens liquidity
//     let operations = await context.pairs[0].tokenToTezSwap(
//       tokenAmount,
//       minTezOut
//     );
//     let fees = calculateFee(operations, bobAddress);

//     // checks
//     let bobFinalTezBalance = await context.tezos.tz.getBalance(bobAddress);
//     await context.tokens[0].updateStorage({
//       ledger: [bobAddress, pairAddress],
//     });
//     let bobFinalTokenBalance = await context.tokens[0].storage.ledger[
//       bobAddress
//     ].balance;

//     let pairTokenBalance = await context.tokens[0].storage.ledger[pairAddress]
//       .balance;
//     let pairTezBalance = await context.tezos.tz.getBalance(pairAddress);

//     // 1. tez sent to user
//     strictEqual(
//       bobInitTezBalance.toNumber() + minTezOut - fees,
//       bobFinalTezBalance.toNumber(),
//       "Tez not received"
//     );
//     strictEqual(pairTezBalance.toNumber(), 10000 - minTezOut, "Tez not sent");

//     // 2. tokens withdrawn and sent to pair contracts
//     strictEqual(
//       bobInitTokenBalance.toNumber() - tokenAmount,
//       bobFinalTokenBalance.toNumber(),
//       "Tokens not sent"
//     );
//     strictEqual(
//       pairTokenBalance.toNumber(),
//       1000000 + tokenAmount,
//       "Tokens not received"
//     );

//     // 3. new pair state
//     await context.pairs[0].updateStorage();
//     strictEqual(
//       context.pairs[0].storage.tezPool.toNumber(),
//       10000 - minTezOut,
//       "Tez pool should decrement by sent amount"
//     );
//     strictEqual(
//       context.pairs[0].storage.tokenPool.toNumber(),
//       1000000 + tokenAmount,
//       "Token pool should decrement by withdrawn amount"
//     );
//     strictEqual(
//       context.pairs[0].storage.invariant.toNumber(),
//       (1000000 + tokenAmount) * (10000 - minTezOut),
//       "Inveriant should be calculated properly"
//     );
//   });

//   it("should fail if min tez amount is too low", async function () {
//     // create context with exchange
//     let context = await Context.init();
//     let tokenAmount = 1000;
//     let minTezOut = 0;

//     // attempt to exchange tokens
//     await rejects(
//       context.pairs[0].tokenToTezSwap(tokenAmount, minTezOut),
//       (err) => {
//         strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
//         return true;
//       },
//       "Swap Dex should fail"
//     );
//   });

//   it("should fail if min tez amount is too high", async function () {
//     // create context with exchange
//     let context = await Context.init();
//     let tokenAmount = 1000;
//     let minTezOut = 1000;

//     // attempt to exchange tokens
//     await rejects(
//       context.pairs[0].tokenToTezSwap(tokenAmount, minTezOut),
//       (err) => {
//         strictEqual(
//           err.message,
//           "Dex/high-min-tez-out",
//           "Error message mismatch"
//         );
//         return true;
//       },
//       "Swap Dex should fail"
//     );
//   });

//   it("should fail if not enough tokens are approved", async function () {
//     // create context with exchange
//     let context = await Context.init();
//     let tokenAmount = 1000;
//     let minTezOut = 10;

//     // get alice address
//     let aliceAddress = await context.tezos.signer.publicKeyHash();

//     // attempt to exchange tokens
//     await rejects(
//       context.pairs[0].contract.methods
//         .use(2, "tokenToTezPayment", tokenAmount, minTezOut, aliceAddress)
//         .send(),
//       (err) => {
//         strictEqual(
//           err.message,
//           "NotEnoughAllowance",
//           "Error message mismatch"
//         );
//         return true;
//       },
//       "Swap Dex should fail"
//     );
//   });

//   it("should fail if tokens amount is too low", async function () {
//     // create context with exchange
//     let context = await Context.init();
//     let tokenAmount = 0;
//     let minTezOut = 1000;

//     // attempt to exchange tokens
//     await rejects(
//       context.pairs[0].tokenToTezSwap(tokenAmount, minTezOut),
//       (err) => {
//         strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
//         return true;
//       },
//       "Swap Dex should fail"
//     );
//   });
// });
