from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal

from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

import time

class DexTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    def test_initialize(self):
        res = self.dex.initializeExchange(100).interpret(amount=10)
        storage = res.storage["storage"]
        self.assertEqual(storage["token_pool"], 100)
        self.assertEqual(storage["tez_pool"], 10)

        # res = self.dex.investLiquidity(30).interpret(amount=20, storage=res.storage)
        # res = self.dex.tezToTokenPayment(2, my_address).interpret(amount=1, storage=res.storage)
        # print(res.storage)
        # print(res.operations)

        # res = self.dex.investLiquidity(2, my_address).interpret(amount=1, storage=res.storage)

        # res = self.my.default('bar').interpret(storage='foo')
        # self.assertEqual('foobar', res.storage)

    def test_fail_initialize(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.initializeExchange(100).interpret(amount=0)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.initializeExchange(0).interpret(amount=1)

    def test_fail_invest_not_init(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.investLiquidity(30).interpret(amount=1)

    def test_fail_divest_not_init(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.divestLiquidity(10, 20, 30).interpret(amount=1)

    def test_swap_not_init(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.tokenToTezPayment(amount=10, min_out=20, receiver=julian).interpret(amount=1)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.tezToTokenPayment(10, julian).interpret(amount=1)

    def test_reward_payment(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100000), amount=100)
        storage = res.storage["storage"]

        res = chain.execute(self.dex.default(), amount=12)
        chain.advance_period()

        res = chain.execute(self.dex.withdrawProfit(my_address), amount=0)
        ops = parse_ops(res)

        firstProfit = ops[0]["amount"]

        chain.advance_period()

        res = chain.execute(self.dex.withdrawProfit(my_address), amount=0)
        ops = parse_ops(res)
        secondProfit = ops[0]["amount"]

        # TODO it is actually super close to 12
        self.assertEqual(firstProfit+secondProfit, 11)

        # nothing is payed after all
        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(my_address), amount=0)
        self.assertEqual(res.operations, [])



    def test_divest_everything(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100_000)

        res = chain.execute(self.dex.divestLiquidity(min_tez=100_000, min_tokens=100_000, shares=100_000), amount=0)

        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        self.assertEqual(ops[0]["amount"], 100_000)

        self.assertEqual(ops[1]["type"], "tez")
        self.assertEqual(ops[1]["amount"], 100_000)

    def test_divest_amount_after_swap(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100_000)

        # swap tokens to tezos
        res = chain.execute(self.dex.tokenToTezPayment(amount=10_000, min_out=1, receiver=julian), amount=0)
        
        ops = parse_ops(res)
        tez_received = ops[1]["amount"]

        # swap the received tezos back to tokens
        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=tez_received)

        # take all the funds out
        res = chain.execute(self.dex.divestLiquidity(min_tez=100_000, min_tokens=100_000, shares=100_000), amount=0)

        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        # ensure we got more tokens cause it should include some fee
        self.assertGreater(ops[0]["amount"], 100_000) 

        self.assertEqual(ops[1]["type"], "tez")
        self.assertGreaterEqual(ops[1]["amount"], 100_000)

    def test_rewards_dont_affect_price(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)
        res = chain.execute(self.dex.investLiquidity(1_000_000), amount=100) # way less tokens is invested actually

        tez_pool_before = res.storage["storage"]["tez_pool"]
        token_pool_before = res.storage["storage"]["token_pool"]

        res = chain.interpret(self.dex.tokenToTezPayment(amount=10_000, min_out=1, receiver=julian))
        ops = parse_ops(res)
        tez_out_before = ops[0]["amount"]

        # give reward
        res = chain.execute(self.dex.default(), amount=100)

        tez_pool_after_reward = res.storage["storage"]["tez_pool"]
        token_pool_after_reward = res.storage["storage"]["token_pool"]

        res = chain.interpret(self.dex.tokenToTezPayment(amount=10_000, min_out=1, receiver=julian))
        ops = parse_ops(res)
        tez_out_after_reward = ops[0]["amount"]

        self.assertEqual(tez_pool_before, tez_pool_after_reward)
        self.assertEqual(token_pool_before, token_pool_after_reward)
        self.assertEqual(tez_out_before, tez_out_after_reward)

        # withdraw reward
        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(my_address), amount=0)

        ops = parse_ops(res)
        profit = ops[0]["amount"]

        self.assertGreater(profit, 0) # some rewards are withdrawn

        tez_pool_after_withdraw = res.storage["storage"]["tez_pool"]
        token_pool_after_withdraw = res.storage["storage"]["token_pool"]

        res = chain.interpret(self.dex.tokenToTezPayment(amount=10_000, min_out=1, receiver=julian), amount=0)
        ops = parse_ops(res)
        tez_out_after_withdraw = ops[0]["amount"]

        self.assertEqual(tez_pool_before, tez_pool_after_withdraw)
        self.assertEqual(token_pool_before, token_pool_after_withdraw)
        self.assertEqual(tez_out_before, tez_out_after_withdraw)



    def test_voting_doesnt_affect_price(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)

        (tez_before, token_before) = get_pool_stats(res)

        res = chain.execute(self.dex.vote(voter=my_address, \
            candidate=dummy_candidate, \
            value=100), \
            amount = 1)

        (tez_after, token_after) = get_pool_stats(res)

        self.assertEqual(tez_before, tez_after)
        self.assertEqual(token_before, token_after)

    def test_divest_after_unvote(self):
        candidate = julian
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)

        (tez_before, token_before) = get_pool_stats(res)

        # vote all-in
        res = chain.execute(self.dex.vote(voter=my_address, \
            candidate=candidate, \
            value=100), \
            amount=0)

        # voting doesn't affect the price
        (tez_after, token_after) = get_pool_stats(res)
        self.assertEqual(tez_before, tez_after)
        self.assertEqual(token_before, token_after)
        self.assertEqual(res.storage["storage"]["reward"], 0)
        
        # can't divest after voting
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=1))

        res = chain.execute(self.dex.vote(voter=my_address, \
            candidate=dummy_candidate, \
            value=0), \
            amount=0)

        # unvoting doesn't affect the price
        (tez_after, token_after) = get_pool_stats(res)
        self.assertEqual(tez_before, tez_after)
        self.assertEqual(token_before, token_after)
        self.assertEqual(res.storage["storage"]["reward"], 0)

        res = chain.execute(self.dex.divestLiquidity(min_tez=100, min_tokens=100_000, shares=100), amount=0)

        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        self.assertEqual(ops[0]["amount"], 100_000)

        self.assertEqual(ops[1]["type"], "tez")
        self.assertEqual(ops[1]["amount"], 100)
        
        self.assertEqual(res.storage["storage"]["reward"], 0)


    def test_reward_even_distribution(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)

        (tez_out_before, token_out_before) = calc_out_per_hundred(chain, self.dex)

        res = chain.execute(self.dex.investLiquidity(100_000), amount=10_000, sender=bob)

        (tez_out_after, token_out_after) = calc_out_per_hundred(chain, self.dex)

        # throw in some votes and vetos
        res = chain.execute(self.dex.vote(voter=alice, candidate=julian, value=333), sender=alice)
        res = chain.execute(self.dex.veto(voter=alice, value=33), sender=alice)

        # throw in fully voted member just to be sure
        res = chain.execute(self.dex.vote(voter=bob, candidate=julian, value=10_000), sender=bob)

        res = chain.execute(self.dex.default(), amount=100)

        chain.advance_period()

        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        ops = parse_ops(res)
        alice_profit = ops[0]["amount"]

        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        ops = parse_ops(res)
        bob_profit = ops[0]["amount"]

        self.assertEqual(alice_profit, bob_profit)

    def test_multiple_swaps(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000_000), amount=100_000)

        total_tokens_gained = 0
        total_tezos_spent = 0
        for i in range(0, 5):
            tez = 1_000
            res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=tez)
            (_, tok) = parse_transfers(res)
            total_tezos_spent += tez
            total_tokens_gained += tok

        res = chain.execute(self.dex.tokenToTezPayment(amount=total_tokens_gained, min_out=1, receiver=julian))
        (tez, tok) = parse_transfers(res)
        
        self.assertLessEqual(tez, total_tezos_spent)   

    def test_zeroing_everything(self):
        me = self.dex.context.get_sender()

        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000_000), amount=100_000_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.investLiquidity(0), amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.investLiquidity(1), amount=0)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=0))

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divestLiquidity(min_tez=0, min_tokens=1, shares=1))
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=0, shares=1))

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=0)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tezToTokenPayment(min_out=0, receiver=julian), amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTezPayment(amount=1, min_out=0, receiver=julian), amount=0)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTezPayment(amount=0, min_out=1, receiver=julian), amount=0)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTezPayment(amount=0, min_out=0, receiver=julian), amount=1)

        # NOTE vote and veto with zero are tested in voting tests

    def test_vault_manipulation(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(1_000_000_000), amount=1_000_000_000)

        res = chain.execute(self.dex.tokenToTezPayment(amount=300_000_000, min_out=1, receiver=julian))

        (tez, tok) = parse_transfers(res)
        print("tez", tez, "tokens", tok)

        # contract agrees to swap disregarding the price
        res = chain.execute(self.dex.tokenToTezPayment(amount=10_000_000, min_out=1, receiver=julian))

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=tez)

        (tez, token) = parse_transfers(res)
        print("Got token", token)

    def test_farm_manipulation(self):
        decimals = pow(10,8)
        total_paul_supply = 100_000_000 * decimals
        
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(total_paul_supply // 3), amount=1_000_000_000)

        loaned_amount = 33_000_000 * decimals // 3
        print("loaned amount", loaned_amount)

        res = chain.execute(self.dex.tokenToTezPayment(amount=loaned_amount, min_out=1, receiver=julian))

        (tez, tok) = parse_transfers(res)
        print("tez", tez, "tokens", tok)

        # contract agrees to swap disregarding the price
        res = chain.execute(self.dex.tokenToTezPayment(amount=1_000_000 * decimals, min_out=1, receiver=julian))

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=tez)

        (tez, token) = parse_transfers(res)
        print("Got token", token)



