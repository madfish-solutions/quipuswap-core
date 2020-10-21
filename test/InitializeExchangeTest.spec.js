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
contract("InitializeExchange()", function () {
    it("should initialize & deploy 1 exchange and set initial stage", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAddress, tezAmount, tokenAmount, aliceAddress, aliceInitTezBalance, aliceInitTokenBalance, pairAddress, aliceFinalTezBalance, aliceFinalTokenBalance, pairTokenBalance, pairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        // ensure no token pairs added
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure no token pairs added
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 0, "Factory tokenList should be empty");
                        return [4 /*yield*/, context.createToken()];
                    case 3:
                        tokenAddress = _a.sent();
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 5:
                        aliceInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({ ledger: [aliceAddress] })];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 7:
                        aliceInitTokenBalance = _a.sent();
                        return [4 /*yield*/, context.createPair({
                                tokenAddress: tokenAddress,
                                tezAmount: tezAmount,
                                tokenAmount: tokenAmount
                            })];
                    case 8:
                        pairAddress = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 9:
                        aliceFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [aliceAddress, pairAddress]
                            })];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 11:
                        aliceFinalTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[pairAddress]
                                .balance];
                    case 12:
                        pairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(pairAddress)];
                    case 13:
                        pairTezBalance = _a.sent();
                        assert_1.strictEqual(aliceInitTokenBalance.toNumber() - tokenAmount, aliceFinalTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.ok(aliceInitTezBalance.toNumber() - tezAmount >=
                            aliceFinalTezBalance.toNumber(), "Tez not sent");
                        // 1.2 tokens/tez send to token pair
                        assert_1.strictEqual(pairTokenBalance.toNumber(), tokenAmount, "Tokens not received");
                        assert_1.strictEqual(pairTezBalance.toNumber(), tezAmount, "Tez not received");
                        // 2. factory state
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 entity");
                        assert_1.notStrictEqual(context.factory.storage.tokenToExchange[context.factory.storage.tokenList[0]], null, "Factory tokenToExchange should contain DexPair contract address");
                        // 3. new pair state
                        return [4 /*yield*/, context.pairs[0].updateStorage({ ledger: [aliceAddress] })];
                    case 14:
                        // 3. new pair state
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(), 1000, "Alice should receive 1000 shares");
                        assert_1.strictEqual(context.pairs[0].storage.totalSupply.toNumber(), 1000, "Alice tokens should be all supply");
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), tezAmount, "Tez pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), tokenAmount, "Token pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), tokenAmount * tezAmount, "Inveriant should be calculated properly");
                        assert_1.strictEqual(context.pairs[0].storage.tokenAddress, tokenAddress, "Token address should match the created token");
                        return [2 /*return*/];
                }
            });
        });
    });
    it.skip("should initialize & deploy a 10 of exchanges and set initial state", function () {
        return __awaiter(this, void 0, void 0, function () {
            var exchangeCount, configs, i, context, aliceAddress, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(500000);
                        exchangeCount = 10;
                        configs = [];
                        for (i = 0; i < exchangeCount; i++) {
                            configs.push({
                                tezAmount: 20 * (exchangeCount - i),
                                tokenAmount: 30000 * (i + 1)
                            });
                        }
                        return [4 /*yield*/, context_1.Context.init(configs, false)];
                    case 1:
                        context = _a.sent();
                        // ensure factory registered 10 exchanges
                        return [4 /*yield*/, context.factory.updateStorage({
                                tokenToExchange: context.factory.storage.tokenList
                            })];
                    case 2:
                        // ensure factory registered 10 exchanges
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, exchangeCount, "Factory tokenList should be empty");
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 3:
                        aliceAddress = _a.sent();
                        i = 0;
                        _a.label = 4;
                    case 4:
                        if (!(i < exchangeCount)) return [3 /*break*/, 7];
                        return [4 /*yield*/, context.pairs[i].updateStorage({ ledger: [aliceAddress] })];
                    case 5:
                        _a.sent();
                        assert_1.strictEqual(context.pairs[i].storage.ledger[aliceAddress].balance.toNumber(), 1000, "Alice should receive 1000 shares");
                        assert_1.strictEqual(context.pairs[i].storage.totalSupply.toNumber(), 1000, "Alice tokens should be all supply");
                        assert_1.strictEqual(context.pairs[i].storage.tezPool.toNumber(), configs[i].tezAmount, "Tez pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[i].storage.tokenPool.toNumber(), configs[i].tokenAmount, "Token pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[i].storage.invariant.toNumber(), configs[i].tokenAmount * configs[i].tezAmount, "Inveriant should be calculated properly");
                        _a.label = 6;
                    case 6:
                        i++;
                        return [3 /*break*/, 4];
                    case 7: return [2 /*return*/];
                }
            });
        });
    });
    it("should initialize existing pair if there are no shares", function () {
        return __awaiter(this, void 0, void 0, function () {
            var tezAmount, tokenAmount, context, tokenAddress, pairAddress, aliceAddress, aliceInitTezBalance, aliceInitTokenBalance, aliceFinalTezBalance, aliceFinalTokenBalance, pairTokenBalance, pairTezBalance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        return [4 /*yield*/, context_1.Context.init([{ tezAmount: tezAmount, tokenAmount: tokenAmount }])];
                    case 1:
                        context = _a.sent();
                        // ensure pair added
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure pair added
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 exchange");
                        // withdraw all liquidity
                        return [4 /*yield*/, context.pairs[0].divestLiquidity(1, 1, 1000)];
                    case 3:
                        // withdraw all liquidity
                        _a.sent();
                        tokenAddress = context.tokens[0].contract.address;
                        pairAddress = context.pairs[0].contract.address;
                        return [4 /*yield*/, context.tezos.signer.publicKeyHash()];
                    case 4:
                        aliceAddress = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 5:
                        aliceInitTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({ ledger: [aliceAddress] })];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 7:
                        aliceInitTokenBalance = _a.sent();
                        // initialize exchange
                        return [4 /*yield*/, context.pairs[0].initializeExchange(tokenAmount, tezAmount)];
                    case 8:
                        // initialize exchange
                        _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(aliceAddress)];
                    case 9:
                        aliceFinalTezBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].updateStorage({
                                ledger: [aliceAddress, pairAddress]
                            })];
                    case 10:
                        _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[aliceAddress].balance];
                    case 11:
                        aliceFinalTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tokens[0].storage.ledger[pairAddress]
                                .balance];
                    case 12:
                        pairTokenBalance = _a.sent();
                        return [4 /*yield*/, context.tezos.tz.getBalance(pairAddress)];
                    case 13:
                        pairTezBalance = _a.sent();
                        // 1.1 tokens/tez withdrawn
                        assert_1.strictEqual(aliceInitTokenBalance.toNumber() - tokenAmount, aliceFinalTokenBalance.toNumber(), "Tokens not sent");
                        assert_1.ok(aliceInitTezBalance.toNumber() - tezAmount >=
                            aliceFinalTezBalance.toNumber(), "Tez not sent");
                        // 1.2 tokens/tez send to token pair
                        assert_1.strictEqual(pairTokenBalance.toNumber(), tokenAmount, "Tokens not received");
                        assert_1.strictEqual(pairTezBalance.toNumber(), tezAmount, "Tez not received");
                        // 2. factory state
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 entity");
                        assert_1.notStrictEqual(context.factory.storage.tokenToExchange[context.factory.storage.tokenList[0]], null, "Factory tokenToExchange should contain DexPair contract address");
                        // 3. new pair state
                        return [4 /*yield*/, context.pairs[0].updateStorage({ ledger: [aliceAddress] })];
                    case 14:
                        // 3. new pair state
                        _a.sent();
                        assert_1.strictEqual(context.pairs[0].storage.ledger[aliceAddress].balance.toNumber(), 1000, "Alice should receive 1000 shares");
                        assert_1.strictEqual(context.pairs[0].storage.totalSupply.toNumber(), 1000, "Alice tokens should be all supply");
                        assert_1.strictEqual(context.pairs[0].storage.tezPool.toNumber(), tezAmount, "Tez pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.tokenPool.toNumber(), tokenAmount, "Token pool should be fully funded by sent amount");
                        assert_1.strictEqual(context.pairs[0].storage.invariant.toNumber(), tokenAmount * tezAmount, "Inveriant should be calculated properly");
                        assert_1.strictEqual(context.pairs[0].storage.tokenAddress, tokenAddress, "Token address should match the created token");
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail initialization & deployment if exchange pair exist", function () {
        return __awaiter(this, void 0, void 0, function () {
            var tezAmount, tokenAmount, context, tokenAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        return [4 /*yield*/, context_1.Context.init([{ tezAmount: tezAmount, tokenAmount: tokenAmount }], false)];
                    case 1:
                        context = _a.sent();
                        // ensure pair added
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure pair added
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 exchange");
                        tokenAddress = context.factory.storage.tokenList[0];
                        return [4 /*yield*/, assert_1.rejects(context.createPair({
                                tokenAddress: tokenAddress,
                                tezAmount: tezAmount,
                                tokenAmount: tokenAmount
                            }), function (err) {
                                assert_1.strictEqual(err.message, "Factory/exchange-launched", "Error message mismatch");
                                return true;
                            }, "Adding Dex should fail")];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail initialization & deployment if no tokens are sent", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAddress, tezAmount, tokenAmount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([], false)];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.createToken()];
                    case 2:
                        tokenAddress = _a.sent();
                        tezAmount = 10000;
                        tokenAmount = 0;
                        // add new exchange pair
                        return [4 /*yield*/, assert_1.rejects(context.createPair({
                                tokenAddress: tokenAddress,
                                tezAmount: tezAmount,
                                tokenAmount: tokenAmount
                            }), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
                                return true;
                            }, "Adding Dex should fail")];
                    case 3:
                        // add new exchange pair
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail initialization & deployment if no tez are sent", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context, tokenAddress, tezAmount, tokenAmount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([], false)];
                    case 1:
                        context = _a.sent();
                        return [4 /*yield*/, context.createToken()];
                    case 2:
                        tokenAddress = _a.sent();
                        tezAmount = 0;
                        tokenAmount = 1000000;
                        // add new exchange pair
                        return [4 /*yield*/, assert_1.rejects(context.createPair({
                                tokenAddress: tokenAddress,
                                tezAmount: tezAmount,
                                tokenAmount: tokenAmount
                            }), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
                                return true;
                            }, "Adding Dex should fail")];
                    case 3:
                        // add new exchange pair
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail initialization if no tokens are sent", function () {
        return __awaiter(this, void 0, void 0, function () {
            var tezAmount, tokenAmount, context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        return [4 /*yield*/, context_1.Context.init([{ tezAmount: tezAmount, tokenAmount: tokenAmount }])];
                    case 1:
                        context = _a.sent();
                        // ensure pair added
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure pair added
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 exchange");
                        // withdraw all liquidity
                        return [4 /*yield*/, context.pairs[0].divestLiquidity(1, 1, 1000)];
                    case 3:
                        // withdraw all liquidity
                        _a.sent();
                        // attempt to initialize exchange
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].initializeExchange(0, tezAmount), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
                                return true;
                            }, "Initializing Dex should fail")];
                    case 4:
                        // attempt to initialize exchange
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail initialization if no tez are sent", function () {
        return __awaiter(this, void 0, void 0, function () {
            var tezAmount, tokenAmount, context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tezAmount = 10000;
                        tokenAmount = 1000000;
                        return [4 /*yield*/, context_1.Context.init([{ tezAmount: tezAmount, tokenAmount: tokenAmount }])];
                    case 1:
                        context = _a.sent();
                        // ensure pair added
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure pair added
                        _a.sent();
                        assert_1.strictEqual(context.factory.storage.tokenList.length, 1, "Factory tokenList should contain 1 exchange");
                        // withdraw all liquidity
                        return [4 /*yield*/, context.pairs[0].divestLiquidity(1, 1, 1000)];
                    case 3:
                        // withdraw all liquidity
                        _a.sent();
                        // attempt to initialize exchange
                        return [4 /*yield*/, assert_1.rejects(context.pairs[0].initializeExchange(tokenAmount, 0), function (err) {
                                assert_1.strictEqual(err.message, "Dex/not-allowed", "Error message mismatch");
                                return true;
                            }, "Initializing Dex should fail")];
                    case 4:
                        // attempt to initialize exchange
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
