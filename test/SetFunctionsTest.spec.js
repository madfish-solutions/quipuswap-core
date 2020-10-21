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
contract("SetXFunctions()", function () {
    it("should set all Dex functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([], false)];
                    case 1:
                        context = _a.sent();
                        // ensure no functions are stored
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure no functions are stored
                        _a.sent();
                        Object.values(context.factory.storage.dexLambdas).forEach(function (value) {
                            assert_1.strictEqual(value, null, "Dex function set");
                        });
                        // set all Dex functions
                        return [4 /*yield*/, context.setDexFactoryFunctions()];
                    case 3:
                        // set all Dex functions
                        _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.dexLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Dex function not set");
                        });
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should set all Token functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([], false)];
                    case 1:
                        context = _a.sent();
                        // ensure no functions are stored
                        return [4 /*yield*/, context.factory.updateStorage()];
                    case 2:
                        // ensure no functions are stored
                        _a.sent();
                        Object.values(context.factory.storage.tokenLambdas).forEach(function (value) {
                            assert_1.strictEqual(value, null, "Token function set");
                        });
                        // set all Token functions
                        return [4 /*yield*/, context.setTokenFactoryFunctions()];
                    case 3:
                        // set all Token functions
                        _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.tokenLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Token function not set");
                        });
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail replacement of Dex functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.dexLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Dex function not set");
                        });
                        // ensure attempt to replace function fails
                        return [4 /*yield*/, assert_1.rejects(context.factory.setDexFunction(1, "initializeExchange"), function (err) {
                                assert_1.strictEqual(err.message, "Factory/function-set", "Error message mismatch");
                                return true;
                            }, "Replacement of dex function should fail")];
                    case 2:
                        // ensure attempt to replace function fails
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail replacement of Token functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.tokenLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Token function not set");
                        });
                        // ensure attempt to replace function fails
                        return [4 /*yield*/, assert_1.rejects(context.factory.setTokenFunction(1, "transfer"), function (err) {
                                assert_1.strictEqual(err.message, "Factory/function-set", "Error message mismatch");
                                return true;
                            }, "Replacement of Token function should fail")];
                    case 2:
                        // ensure attempt to replace function fails
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail adding more than 9 Dex functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.dexLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Dex function not set");
                        });
                        // ensure attempt to add extra function fails
                        return [4 /*yield*/, assert_1.rejects(context.factory.setDexFunction(9, "initializeExchange"), function (err) {
                                assert_1.strictEqual(err.message, "Factory/wrong-index", "Error message mismatch");
                                return true;
                            }, "Adding more dex functions should fail")];
                    case 2:
                        // ensure attempt to add extra function fails
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it("should fail adding more than 5 Token functions to Factory", function () {
        return __awaiter(this, void 0, void 0, function () {
            var context;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, context_1.Context.init([])];
                    case 1:
                        context = _a.sent();
                        // ensure code added
                        Object.values(context.factory.storage.tokenLambdas).forEach(function (value) {
                            assert_1.notStrictEqual(value, null, "Token function not set");
                        });
                        // ensure attempt to replace function fails
                        return [4 /*yield*/, assert_1.rejects(context.factory.setTokenFunction(5, "transfer"), function (err) {
                                assert_1.strictEqual(err.message, "Factory/wrong-index", "Error message mismatch");
                                return true;
                            }, "Adding more token functions should fail")];
                    case 2:
                        // ensure attempt to replace function fails
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
});
