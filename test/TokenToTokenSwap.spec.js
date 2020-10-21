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
contract("TokenToTokenSwap()", function () {
    it("should exchnge token to token and update dex state", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAmount, middleTezAmount, minTokensOut, firstDexContract, secondDexContract, aliceAddress, bobAddress, bobInitTezBalance, bobInitFirstTokenLedger, bobInitSecondTokenLedger, bobInitFirstTokenBalance, bobInitSecondTokenBalance, bobFinalTezBalance, bobFinalFirstTokenBalance, bobFinalSecondTokenBalance, firstPairTokenBalance, firstPairTezBalance, secondPairTokenBalance, secondPairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(5000000);
                        return [4 /*yield*/, context_1.Context.init([
                                { tezAmount: 10000, tokenAmount: 1000000 },
                                { tezAmount: 20000, tokenAmount: 10000 },
                            ])];
                    case 1:
                        context = _a.sent();
                        tokenAmount = 1000;
                        middleTezAmount = 10;
                        minTokensOut = 5;
                        firstDexContract = context.pairs[0].contract;
                        secondDexContract = context.pairs[1].contract;
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
                        return [4 /*yield*/, context.updateActor("../../fixtures/key1")];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 8:
                        bobInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({ ledger: [bobAddress] })];
                    case 9:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[1].updateStorage({ ledger: [bobAddress] })];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress]];
                    case 11:
                        bobInitFirstTokenLedger = _a.sent();
                        return [4 /*yield*/, context.tokens[1].storage.ledger[bobAddress]];
                    case 12:
                        bobInitSecondTokenLedger = _a.sent();
                        bobInitFirstTokenBalance = bobInitFirstTokenLedger
                            ? bobInitFirstTokenLedger.balance
                            : new bignumber_js_1["default"](0);
                        bobInitSecondTokenBalance = bobInitSecondTokenLedger
                            ? bobInitSecondTokenLedger.balance
                            : new bignumber_js_1["default"](0);
                        // swap tokens liquidity
                        return [4 /*yield*/, context.pairs[0].tokenToTokenSwap(tokenAmount, minTokensOut, secondDexContract, middleTezAmount)];
                    case 13:
                        // swap tokens liquidity
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(bobAddress)];
                    case 14:
                        bobFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [bobAddress, firstDexContract.address]
                            })];
                    case 15:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[1].updateStorage({
                                ledger: [bobAddress, secondDexContract.address]
                            })];
                    case 16:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[bobAddress].balance];
                    case 17:
                        bobFinalFirstTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[1].storage.ledger[bobAddress].balance];
                    case 18:
                        bobFinalSecondTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[firstDexContract.address].balance];
                    case 19:
                        firstPairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(firstDexContract.address)];
                    case 20:
                        firstPairTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[1].storage.ledger[secondDexContract.address].balance];
                    case 21:
                        secondPairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(secondDexContract.address)];
                    case 22:
                        secondPairTezBalance = _a.sent();
                        // 1. check tez balances
                        assert_1.ok(bobInitTezBalance.toNumber() > bobFinalTezBalance.toNumber(), "Tez should be spent to fee");
                        assert_1.strictEqual(firstPairTezBalance.toNumber(), 10000 - middleTezAmount, "Tez not withdrawn");
                        assert_1.strictEqual(secondPairTezBalance.toNumber(), 20000 + middleTezAmount, "Tez not received");
                        // 2. check tokens balances
                        assert_1.strictEqual(bobInitFirstTokenBalance.toNumber() - tokenAmount, bobFinalFirstTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.strictEqual(bobInitSecondTokenBalance.toNumber() + minTokensOut, bobFinalSecondTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.strictEqual(firstPairTokenBalance.toNumber(), 1000000 + tokenAmount, "Tokens not received");
                        assert_1.strictEqual(secondPairTokenBalance.toNumber(), 10000 - minTokensOut, "Tokens not received");
                        // 3. new pairs state
                        return [4 /*yield*/, context.pairs[0].updateStorage()];
                    case 23:
                        // 3. new pairs state
                        _a.sent();
                        return [4 /*yield*/, context.pairs[1].updateStorage()];
                    case 24:
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), 10000 - middleTezAmount, "Tez pool should decrement by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), 1000000 + tokenAmount, "Token pool should decrement by withdrawn amount");
                        assert_1.strictEqual(context.pairs[1].storage.tezPool.toNumber(), 20000 + middleTezAmount, "Tez pool should decrement by sent amount");
                        assert_1.strictEqual(context.pairs[1].storage.tokenPool.toNumber(), 10000 - minTokensOut, "Token pool should decrement by withdrawn amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), (1000000 + tokenAmount) * (10000 - middleTezAmount), "Inveriant should be calculated properly");
                        assert_1.strictEqual(context.pairs[1].storage.invariant.toNumber(), (20000 + middleTezAmount) * (10000 - minTokensOut), "Inveriant should be calculated properly");
                        return [2 /*return*/];
                }
            });
        });
    });
});
