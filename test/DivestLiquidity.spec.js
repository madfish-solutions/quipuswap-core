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
contract("DivestLiquidity()", function () {
    it("should divest liquidity and burn shares by current provider", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tezAmount, tokenAmount, sharesBurned, pairAddress, aliceAddress, aliceInitTezBalance, aliceInitTokenBalance, aliceFinalTezBalance, aliceFinalTokenBalance, pairTokenBalance, pairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        tezAmount = 1000;
                        tokenAmount = 100000;
                        sharesBurned = 100;
                        pairAddress = context.pairs[0].contract.address;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 3:
                        aliceInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({ ledger: [aliceAddress] })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 5:
                        aliceInitTokenBalance = _a.sent();
                        // dinest liquidity
                        return [4 /*yield*/, context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned)];
                    case 6:
                        // dinest liquidity
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 7:
                        aliceFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [aliceAddress, pairAddress]
                            })];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 9:
                        aliceFinalTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[pairAddress]
                                .balance];
                    case 10:
                        pairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(pairAddress)];
                    case 11:
                        pairTezBalance = _a.sent();
                        // 1. tokens/tez sent to user
                        assert_1.strictEqual(aliceInitTokenBalance.toNumber() + tokenAmount, aliceFinalTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.ok(aliceInitTezBalance.toNumber() + tezAmount >=
                            aliceFinalTezBalance.toNumber(), "Tez not sent");
                        // 2. tokens/tez withdrawn
                        assert_1.strictEqual(pairTokenBalance.toNumber(), 1000000 - tokenAmount, "Tokens not received");
                        assert_1.strictEqual(pairTezBalance.toNumber(), 10000 - tezAmount, "Tez not received");
                        // 3. new pair state
                        return [4 /*yield*/, context.pairs[0].updateStorage({ ledger: [aliceAddress] })];
                    case 12:
                        // 3. new pair state
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(), 1000 - sharesBurned, "Alice should receive 1000 shares");
                        assert_1.strictEqual(context.pairs[0].storage.totalSupply.toNumber(), 1000 - sharesBurned, "Alice tokens should be all supply");
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), 10000 - tezAmount, "Tez pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), 1000000 - tokenAmount, "Token pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), (1000000 - tokenAmount) * (10000 - tezAmount), "Inveriant should be calculated properly");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should divest liquidity and burn shares transfered from another user", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tezAmount, tokenAmount, sharesBurned, pairAddress, aliceAddress, bobAddress, bobInitTezBalance, bobInitTokenLedger, bobInitTokenBalance, bobFinalTezBalance, bobFinalTokenBalance, pairTokenBalance, pairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        tezAmount = 1000;
                        tokenAmount = 100000;
                        sharesBurned = 100;
                        pairAddress = context.pairs[0].contract.address;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        // update keys
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 3:
                        // update keys
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 5:
                        _a.sent();
                        // send tokens to bob
                        return [4 /*yield*/, context.pairs[0].transfer(aliceAddress, bobAddress, 1000)];
                    case 6:
                        // send tokens to bob
                        _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 8:
                        bobInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({ ledger: [bobAddress] })];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress]];
                    case 10:
                        bobInitTokenLedger = _a.sent();
                        bobInitTokenBalance = bobInitTokenLedger
                            ? bobInitTokenLedger.balance
                            : new bignumber_js_1["default"](0);
                        // divest liquidity
                        return [4 /*yield*/, context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned)];
                    case 11:
                        // divest liquidity
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 12:
                        bobFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [bobAddress, pairAddress]
                            })];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress].balance];
                    case 14:
                        bobFinalTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[pairAddress]
                                .balance];
                    case 15:
                        pairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(pairAddress)];
                    case 16:
                        pairTezBalance = _a.sent();
                        // 1. tokens/tez sent to user
                        assert_1.strictEqual(bobInitTokenBalance.toNumber() + tokenAmount, bobFinalTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.ok(bobInitTezBalance.toNumber() + tezAmount >= bobFinalTezBalance.toNumber(), "Tez not sent");
                        // 2. tokens/tez withdrawn
                        assert_1.strictEqual(pairTokenBalance.toNumber(), 1000000 - tokenAmount, "Tokens not received");
                        assert_1.strictEqual(pairTezBalance.toNumber(), 10000 - tezAmount, "Tez not received");
                        // 3. new pair state
                        return [4 /*yield*/, context.pairs[0].updateStorage({ ledger: [bobAddress] })];
                    case 17:
                        // 3. new pair state
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.ledger[bobAddress].balance.toNumber(), 1000 - sharesBurned, "Alice should receive 1000 shares");
                        assert_1.strictEqual(context.pairs[0].storage.totalSupply.toNumber(), 1000 - sharesBurned, "Alice tokens should be all supply");
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), 10000 - tezAmount, "Tez pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), 1000000 - tokenAmount, "Token pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), (1000000 - tokenAmount) * (10000 - tezAmount), "Inveriant should be calculated properly");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail divestment if not enough shares to burn", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tezAmount, tokenAmount, sharesBurned;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        sharesBurned = 10001;
                        // attempt to invest liquidity
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned), function (err) {
                                assert_1.strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
                                return true;
                            }, "Investment to Dex should fail")];
                    case 2:
                        // attempt to invest liquidity
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail divestment if required shares to burn is zero", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tezAmount, tokenAmount, sharesBurned;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        tezAmount = 1000;
                        tokenAmount = 100000;
                        sharesBurned = 0;
                        // attempt to invest liquidity
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].divestLiquidity(tokenAmount, tezAmount, sharesBurned), function (err) {
                                assert_1.strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
                                return true;
                            }, "Investment to Dex should fail")];
                    case 2:
                        // attempt to invest liquidity
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
