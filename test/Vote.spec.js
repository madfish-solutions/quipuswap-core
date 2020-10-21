"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var context_1 = require("./contracManagers/context");
var assert_1 = require("assert");
var bignumber_js_1 = require("bignumber.js");
contract("Vote()", function () {
    it("should vote and set first candidate", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, carolAddress, delegate, value, aliceAddress, aliceInitVoteInfo, aliceInitSharesInfo, aliceInitCandidateVotes, initVotes, aliceFinalVoteInfo, aliceFinalSharesInfo, aliceFinalCandidateVotes, finalVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        // get gelegate address
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 2:
                        // get gelegate address
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 4:
                        _a.sent();
                        delegate = carolAddress;
                        value = 500;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 5:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 6:
                        _a.sent();
                        aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 7:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 8:
                        // checks
                        _a.sent();
                        aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceFinalSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // 1. tokens frozen
                        assert_1.strictEqual(aliceFinalSharesInfo.balance.toNumber(), aliceInitSharesInfo.balance.toNumber() - value, "Tokens not removed");
                        assert_1.strictEqual(aliceFinalSharesInfo.frozenBalance.toNumber(), aliceInitSharesInfo.frozenBalance.toNumber() + value, "Tokens not frozen");
                        // 2. voter info updated
                        assert_1.strictEqual(aliceFinalVoteInfo.candidate, delegate, "User candidate wasn't updated");
                        assert_1.strictEqual(aliceFinalVoteInfo.vote.toNumber(), value, "User vote wasn't updated");
                        // 3. votes added
                        assert_1.strictEqual(aliceFinalCandidateVotes.toNumber(), aliceInitCandidateVotes.toNumber() + value, "Candidate didn't receive tokens");
                        // 4. global state updated
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        assert_1.strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should vote and replace candidate ", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, bobAddress, carolAddress, aliceAddress, delegate, initValue, aliceInitVoteInfo, aliceInitSharesInfo, aliceInitCandidateVotes, initVotes, value, aliceFinalVoteInfo, aliceFinalSharesInfo, aliceFinalCandidateVotes, finalVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        // get addresses
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 2:
                        // get addresses
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 5:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 7:
                        aliceAddress = _a.sent();
                        delegate = bobAddress;
                        initValue = 500;
                        // vote for first time
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, initValue)];
                    case 8:
                        // vote for first time
                        _a.sent();
                        // store prev balances
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 9:
                        // store prev balances
                        _a.sent();
                        aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        delegate = carolAddress;
                        value = 200;
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 10:
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 11:
                        // checks
                        _a.sent();
                        aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceFinalSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // 1. tokens frozen
                        assert_1.strictEqual(aliceFinalSharesInfo.balance.toNumber(), aliceInitSharesInfo.balance.toNumber() + initValue - value, "Tokens not removed");
                        assert_1.strictEqual(aliceFinalSharesInfo.frozenBalance.toNumber(), aliceInitSharesInfo.frozenBalance.toNumber() - initValue + value, "Tokens not frozen");
                        // 2. voter info updated
                        assert_1.strictEqual(aliceFinalVoteInfo.candidate, delegate, "User candidate wasn't updated");
                        assert_1.strictEqual(aliceFinalVoteInfo.vote.toNumber(), aliceInitVoteInfo.vote.toNumber() - initValue + value, "User vote wasn't updated");
                        // 3. votes added
                        assert_1.strictEqual(aliceFinalCandidateVotes.toNumber(), value, "Candidate didn't receive tokens");
                        // 4. global state updated
                        assert_1.strictEqual(initVotes.toNumber() - initValue + value, finalVotes.toNumber(), "Total votes weren't updated");
                        assert_1.strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should vote for the same candidate", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, carolAddress, delegate, initValue, aliceAddress, value, aliceInitVoteInfo, aliceInitSharesInfo, aliceInitCandidateVotes, initVotes, aliceFinalVoteInfo, aliceFinalSharesInfo, aliceFinalCandidateVotes, finalVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        // get gelegate address
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 2:
                        // get gelegate address
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 4:
                        _a.sent();
                        delegate = carolAddress;
                        initValue = 500;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 5:
                        aliceAddress = _a.sent();
                        // vote for the first time
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, initValue)];
                    case 6:
                        // vote for the first time
                        _a.sent();
                        value = 100;
                        // store prev balances
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 7:
                        // store prev balances
                        _a.sent();
                        aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 8:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 9:
                        // checks
                        _a.sent();
                        aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceFinalSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // 1. tokens frozen
                        assert_1.strictEqual(aliceFinalSharesInfo.balance.toNumber(), aliceInitSharesInfo.balance.toNumber() - value + initValue, "Tokens not removed");
                        assert_1.strictEqual(aliceFinalSharesInfo.frozenBalance.toNumber(), aliceInitSharesInfo.frozenBalance.toNumber() + value - initValue, "Tokens not frozen");
                        // 2. voter info updated
                        assert_1.strictEqual(aliceFinalVoteInfo.candidate, delegate, "User candidate wasn't updated");
                        assert_1.strictEqual(aliceFinalVoteInfo.vote.toNumber(), value, "User vote wasn't updated");
                        // 3. votes added
                        assert_1.strictEqual(aliceFinalCandidateVotes.toNumber(), aliceInitCandidateVotes.toNumber() + value - initValue, "Candidate didn't receive tokens");
                        // 4. global state updated
                        assert_1.strictEqual(initVotes.toNumber() + value - initValue, finalVotes.toNumber(), "Total votes weren't updated");
                        assert_1.strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should vote for None candidate ", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, carolAddress, delegate, value, aliceAddress, aliceInitVoteInfo, aliceInitSharesInfo, aliceInitCandidateVotes, initVotes, initCurrentCandidate, aliceFinalVoteInfo, aliceFinalSharesInfo, aliceFinalCandidateVotes, finalVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        // get gelegate address
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 2:
                        // get gelegate address
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 4:
                        _a.sent();
                        delegate = carolAddress;
                        value = 500;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 5:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 7:
                        _a.sent();
                        aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        initCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, 0)];
                    case 8:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 9:
                        // checks
                        _a.sent();
                        aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceFinalSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // 1. tokens frozen
                        assert_1.strictEqual(aliceFinalSharesInfo.balance.toNumber(), aliceInitSharesInfo.balance.toNumber() + value, "Tokens not removed");
                        assert_1.strictEqual(aliceFinalSharesInfo.frozenBalance.toNumber(), 0, "Tokens not frozen");
                        // 2. voter info updated
                        assert_1.strictEqual(aliceFinalVoteInfo.candidate, delegate, "User candidate wasn't updated");
                        assert_1.strictEqual(aliceFinalVoteInfo.vote.toNumber(), 0, "User vote wasn't updated");
                        // 3. votes added
                        assert_1.strictEqual(aliceFinalCandidateVotes.toNumber(), aliceInitCandidateVotes.toNumber() - value, "Candidate didn't receive tokens");
                        // 4. global state updated
                        assert_1.strictEqual(initVotes.toNumber() - value, finalVotes.toNumber(), "Total votes weren't updated");
                        assert_1.strictEqual(finalCurrentCandidate, initCurrentCandidate, "Candidate wasn't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should allow to vote and set candidate by approved user", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, bobAddress, delegate, value, aliceInitVoteInfo, aliceInitSharesInfo, aliceInitCandidateVotes, initVotes, aliceFinalVoteInfo, aliceFinalSharesInfo, aliceFinalCandidateVotes, finalVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        // get gelegate address
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 3:
                        // get gelegate address
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 5:
                        _a.sent();
                        // approve tokens
                        return [4 /*yield*/, context.pairs[0].approve(bobAddress, 500)];
                    case 6:
                        // approve tokens
                        _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 7:
                        _a.sent();
                        delegate = bobAddress;
                        value = 500;
                        // store prev balances
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 8:
                        // store prev balances
                        _a.sent();
                        aliceInitVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceInitSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 9:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                ledger: [aliceAddress],
                                voters: [aliceAddress],
                                votes: [delegate]
                            })];
                    case 10:
                        // checks
                        _a.sent();
                        aliceFinalVoteInfo = context.pairs[0].storage.voters[aliceAddress] || {
                            candidate: undefined,
                            vote: new bignumber_js_1["default"](0),
                            veto: new bignumber_js_1["default"](0)
                        };
                        aliceFinalSharesInfo = context.pairs[0].storage.ledger[aliceAddress] || {
                            balance: new bignumber_js_1["default"](0),
                            frozenBalance: new bignumber_js_1["default"](0),
                            allowances: {}
                        };
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[delegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // 1. tokens frozen
                        assert_1.strictEqual(aliceFinalSharesInfo.balance.toNumber(), aliceInitSharesInfo.balance.toNumber() - value, "Tokens not removed");
                        assert_1.strictEqual(aliceFinalSharesInfo.frozenBalance.toNumber(), aliceInitSharesInfo.frozenBalance.toNumber() + value, "Tokens not frozen");
                        // 2. voter info updated
                        assert_1.strictEqual(aliceFinalVoteInfo.candidate, delegate, "User candidate wasn't updated");
                        assert_1.strictEqual(aliceFinalVoteInfo.vote.toNumber(), aliceInitVoteInfo.vote.toNumber() + value, "User vote wasn't updated");
                        // 3. votes added
                        assert_1.strictEqual(aliceFinalCandidateVotes.toNumber(), aliceInitCandidateVotes.toNumber() + value, "Candidate didn't receive tokens");
                        // 4. global state updated
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        assert_1.strictEqual(finalCurrentCandidate, delegate, "Candidate wasn't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it.only("should update current candidate", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, carolAddress, bobAddress, value, aliceDelegate, bobDelegate, aliceInitCandidateVotes, bobInitCandidateVotes, initVotes, aliceFinalCandidateVotes, finalVotes, initCurrentCandidate, bobFinalCandidateVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 6:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 7:
                        _a.sent();
                        value = 500;
                        return [4 /*yield*/, context.pairs[0].transfer(aliceAddress, bobAddress, value)];
                    case 8:
                        _a.sent();
                        aliceDelegate = carolAddress;
                        bobDelegate = bobAddress;
                        value = 200;
                        // store prev balances
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 9:
                        // store prev balances
                        _a.sent();
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[aliceDelegate] || new bignumber_js_1["default"](0);
                        bobInitCandidateVotes = context.pairs[0].storage.votes[bobDelegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, aliceDelegate, value)];
                    case 10:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 11:
                        // checks
                        _a.sent();
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[aliceDelegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        initCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // check global state
                        assert_1.strictEqual(aliceInitCandidateVotes.toNumber() + value, aliceFinalCandidateVotes.toNumber(), "Tokens not voted");
                        assert_1.strictEqual(initCurrentCandidate, aliceDelegate, "Candidate not updated");
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        initVotes = finalVotes;
                        // vote from Bob
                        value = 500;
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, context.pairs[0].vote(bobAddress, bobDelegate, value)];
                    case 13:
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 14:
                        // checks
                        _a.sent();
                        bobFinalCandidateVotes = context.pairs[0].storage.votes[bobDelegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // check global state
                        assert_1.strictEqual(bobInitCandidateVotes.toNumber() + value, bobFinalCandidateVotes.toNumber(), "Tokens not voted");
                        assert_1.strictEqual(finalCurrentCandidate, bobDelegate, "Candidate not updated");
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it.only("should not update current candidate", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, carolAddress, bobAddress, value, aliceDelegate, bobDelegate, aliceInitCandidateVotes, bobInitCandidateVotes, initVotes, aliceFinalCandidateVotes, finalVotes, initCurrentCandidate, bobFinalCandidateVotes, finalCurrentCandidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 6:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 7:
                        _a.sent();
                        value = 500;
                        return [4 /*yield*/, context.pairs[0].transfer(aliceAddress, bobAddress, value)];
                    case 8:
                        _a.sent();
                        aliceDelegate = carolAddress;
                        bobDelegate = bobAddress;
                        value = 200;
                        // store prev balances
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 9:
                        // store prev balances
                        _a.sent();
                        aliceInitCandidateVotes = context.pairs[0].storage.votes[aliceDelegate] || new bignumber_js_1["default"](0);
                        bobInitCandidateVotes = context.pairs[0].storage.votes[bobDelegate] || new bignumber_js_1["default"](0);
                        initVotes = context.pairs[0].storage.totalVotes;
                        // vote
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, aliceDelegate, value)];
                    case 10:
                        // vote
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 11:
                        // checks
                        _a.sent();
                        aliceFinalCandidateVotes = context.pairs[0].storage.votes[aliceDelegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        initCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // check global state
                        assert_1.strictEqual(aliceInitCandidateVotes.toNumber() + value, aliceFinalCandidateVotes.toNumber(), "Tokens not voted");
                        assert_1.strictEqual(initCurrentCandidate, aliceDelegate, "Candidate not updated");
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        initVotes = finalVotes;
                        // vote from Bob
                        value = 100;
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, context.pairs[0].vote(bobAddress, bobDelegate, value)];
                    case 13:
                        _a.sent();
                        // checks
                        return [4 /*yield*/, context.pairs[0].updateStorage({
                                votes: [aliceDelegate, bobDelegate]
                            })];
                    case 14:
                        // checks
                        _a.sent();
                        bobFinalCandidateVotes = context.pairs[0].storage.votes[bobDelegate] || new bignumber_js_1["default"](0);
                        finalVotes = context.pairs[0].storage.totalVotes;
                        finalCurrentCandidate = context.pairs[0].storage.currentCandidate;
                        // check global state
                        assert_1.strictEqual(bobInitCandidateVotes.toNumber() + value, bobFinalCandidateVotes.toNumber(), "Tokens not voted");
                        assert_1.strictEqual(finalCurrentCandidate, aliceDelegate, "Candidate not updated");
                        assert_1.strictEqual(initVotes.toNumber() + value, finalVotes.toNumber(), "Total votes weren't updated");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail voting without shares", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, carolAddress, delegate, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        carolAddress = _a.sent();
                        delegate = aliceAddress;
                        value = 500;
                        // vote
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].vote(carolAddress, delegate, value), function (err) {
                                assert_1.strictEqual(err.message, "Dex/no-shares", "Error message mismatch");
                                return true;
                            }, "Vote should fail")];
                    case 5:
                        // vote
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail voting for veto candidate", function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    });
    it("should fail voting with shares exeeded liquid balance", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, delegate, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        delegate = aliceAddress;
                        value = 5000;
                        // vote
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].vote(aliceAddress, delegate, value), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-enough-balance", "Error message mismatch");
                                return true;
                            }, "Vote should fail")];
                    case 3:
                        // vote
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail voting with shares exeeded liquid & frozen balance", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, delegate, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        delegate = aliceAddress;
                        value = 1000;
                        return [4 /*yield*/, context.pairs[0].vote(aliceAddress, delegate, value)];
                    case 3:
                        _a.sent();
                        value = 1001;
                        // vote
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].vote(aliceAddress, delegate, value), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-enough-balance", "Error message mismatch");
                                return true;
                            }, "Vote should fail")];
                    case 4:
                        // vote
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail voting with low allowance", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, delegate, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 3:
                        _a.sent();
                        delegate = aliceAddress;
                        value = 500;
                        // vote
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].vote(aliceAddress, delegate, value), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-enough-allowance", "Error message mismatch");
                                return true;
                            }, "Vote should fail")];
                    case 4:
                        // vote
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
