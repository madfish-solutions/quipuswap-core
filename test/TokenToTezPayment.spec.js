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
var utils_1 = require("./contracManagers/utils");
contract("TokenToTezPayment()", function () {
    it("should exchnge token to tez and update dex state", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAmount, minTezOut, pairAddress, aliceAddress, bobAddress, carolAddress, bobInitTezBalance, carolInitTezBalance, bobInitTokenLedger, bobInitTokenBalance, operations, fees, bobFinalTezBalance, bobFinalTokenLedger, bobFinalTokenBalance, carolFinalTezBalance, pairTokenBalance, pairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        tokenAmount = 1000;
                        minTezOut = 10;
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
                        return [4 /*yield*/, context.tokens[0].transfer(aliceAddress, bobAddress, tokenAmount)];
                    case 6:
                        // send tokens to bob
                        _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key2")];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 8:
                        carolAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 10:
                        bobInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(carolAddress)];
                    case 11:
                        carolInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [bobAddress, carolAddress]
                            })];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress]];
                    case 13:
                        bobInitTokenLedger = _a.sent();
                        bobInitTokenBalance = bobInitTokenLedger
                            ? bobInitTokenLedger.balance
                            : new bignumber_js_1["default"](0);
                        return [4 /*yield*/, context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, carolAddress)];
                    case 14:
                        operations = _a.sent();
                        fees = utils_1.calculateFee(operations, bobAddress);
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 15:
                        bobFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [bobAddress, pairAddress, carolAddress]
                            })];
                    case 16:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress]];
                    case 17:
                        bobFinalTokenLedger = _a.sent();
                        bobFinalTokenBalance = bobFinalTokenLedger
                            ? bobFinalTokenLedger.balance
                            : new bignumber_js_1["default"](0);
                        return [4 /*yield*/, context.tezos.tz.getBalance(carolAddress)];
                    case 18:
                        carolFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[pairAddress]
                                .balance];
                    case 19:
                        pairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(pairAddress)];
                    case 20:
                        pairTezBalance = _a.sent();
                        // 1. tez sent to user
                        // strictEqual(
                        //   bobInitTezBalance.toNumber() - fees,
                        //   bobFinalTezBalance.toNumber(),
                        //   "Tez not received"
                        // );
                        assert_1.strictEqual(carolInitTezBalance.toNumber() + minTezOut, carolFinalTezBalance.toNumber(), "Tez not received");
                        assert_1.strictEqual(pairTezBalance.toNumber(), 10000 - minTezOut, "Tez not sent");
                        // 2. tokens withdrawn and sent to pair contracts
                        assert_1.strictEqual(bobInitTokenBalance.toNumber() - tokenAmount, bobFinalTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.strictEqual(pairTokenBalance.toNumber(), 1000000 + tokenAmount, "Tokens not received");
                        // 3. new pair state
                        return [4 /*yield*/, context.pairs[0].updateStorage()];
                    case 21:
                        // 3. new pair state
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), 10000 - minTezOut, "Tez pool should decrement by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), 1000000 + tokenAmount, "Token pool should decrement by withdrawn amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), (1000000 + tokenAmount) * (10000 - minTezOut), "Inveriant should be calculated properly");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail if min tez amount is too low", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, tokenAmount, minTezOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 3:
                        _a.sent();
                        tokenAmount = 1000;
                        minTezOut = 0;
                        // attempt to exchange tokens
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress), function (err) {
                                assert_1.strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
                                return true;
                            }, "Swap Dex should fail")];
                    case 4:
                        // attempt to exchange tokens
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail if min tez amount is too high", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, tokenAmount, minTezOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 3:
                        _a.sent();
                        tokenAmount = 1000;
                        minTezOut = 1000;
                        // attempt to exchange tokens
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress), function (err) {
                                assert_1.strictEqual(err.message, "Dex/high-min-tez-out", "Error message mismatch");
                                return true;
                            }, "Swap Dex should fail")];
                    case 4:
                        // attempt to exchange tokens
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail if not enough tokens are approved", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAmount, minTezOut, bobAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        tokenAmount = 1000;
                        minTezOut = 10;
                        // get alice address
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 2:
                        // get alice address
                        _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        bobAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor()];
                    case 4:
                        _a.sent();
                        // attempt to exchange tokens
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].contract.methods
                                .use(2, "tokenToTezPayment", tokenAmount, minTezOut, bobAddress)
                                .send(), function (err) {
                                assert_1.strictEqual(err.message, "NotEnoughAllowance", "Error message mismatch");
                                return true;
                            }, "Swap Dex should fail")];
                    case 5:
                        // attempt to exchange tokens
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail if tokens amount is too low", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, aliceAddress, tokenAmount, minTezOut;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init()];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 2:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 3:
                        _a.sent();
                        tokenAmount = 0;
                        minTezOut = 1000;
                        // attempt to exchange tokens
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].tokenToTezPayment(tokenAmount, minTezOut, aliceAddress), function (err) {
                                assert_1.strictEqual(err.message, "Dex/wrong-params", "Error message mismatch");
                                return true;
                            }, "Swap Dex should fail")];
                    case 4:
                        // attempt to exchange tokens
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
