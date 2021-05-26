from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal
import math

import pytest
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

pair = {
    "token_a_address" : "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
    "token_a_id" : 0,
    "token_b_address" : "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC",
    "token_b_id" : 1
}

class TokenToTokenTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./MockTTDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)
    
    def test_tt_dex_init(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain(True)

        res = chain.execute(self.dex.initializeExchange(pair,10_000, 10_000), sender=julian)

        print(res.storage["storage"])

    def test_tt_dex_swap_and_divest(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain(True)

        res = chain.execute(self.dex.initializeExchange(pair, 100_000, 100_000))

        res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=10_000, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)
        amount_bought = ops[1]["amount"]

        res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="sell", amount_in=amount_bought, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)

        res = chain.execute(self.dex.divestLiquidity(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), amount=0)
        
        ops = parse_ops(res)
        self.assertGreaterEqual(ops[0]["amount"], 100_000) 
        self.assertGreaterEqual(ops[1]["amount"], 100_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=100, min_amount_out=1, receiver=julian), amount=1)

    def test_cant_init_already_init(self):
        chain = LocalChain(True)

        res = chain.execute(self.dex.initializeExchange(pair, 100_000, 100_000))
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.initializeExchange(pair, 100_000, 10_000))

    def test_tt_propotions(self):
        init_supply_a = 100
        init_supply_b = 10**127
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.initializeExchange(pair, init_supply_a, init_supply_b))
        res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="sell", amount_in=1, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)
        amount_bought = ops[1]["amount"]

        print(res.storage["storage"])


    def test_two_pairs_dont_interfere(self):
        second_pair = pair.copy()
        second_pair["token_b_id"] += 1

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.initializeExchange(pair, 100_000_000, 100_000))
        res = chain.execute(self.dex.initializeExchange(second_pair, 10_000, 100_000))

        res = chain.interpret(self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=100, min_amount_out=1, receiver=julian))
        ops = parse_ops(res)
        token_a_out_before = ops[0]["amount"]
        token_b_out_before = ops[1]["amount"]

        # perform a swap on the second pair
        res = chain.execute(self.dex.tokenToTokenPayment(pair=second_pair, operation="buy", amount_in=100, min_amount_out=1, receiver=julian))

        res = chain.execute(self.dex.tokenToTokenPayment(pair=second_pair, operation="sell", amount_in=1, min_amount_out=1, receiver=julian))

        # ensure first token price in unscathed
        res = chain.interpret(self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=100, min_amount_out=1, receiver=julian))
        ops = parse_ops(res)
        token_a_out_after = ops[0]["amount"]
        token_b_out_after = ops[1]["amount"]

        self.assertEqual(token_a_out_before, token_a_out_after)
        self.assertEqual(token_b_out_before, token_b_out_after)


    def test_tt_uninitialized(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.investLiquidity(pair=pair, token_a_in=10_000, token_b_in=10_000, shares=100).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.divestLiquidity(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=10, min_amount_out=10, receiver=julian).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.tokenToTokenPayment(pair=pair, operation="sell", amount_in=10, min_amount_out=10, receiver=julian).interpret(amount=1)


    def test_tt_invest_ridiculous_rate(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.initializeExchange(pair, 100, 100_000))

        invariant_before = calc_pool_rate(res, pair=0)
        
        # invest at okay rate
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=100, token_b_in=100_000, shares=100))

        # invest at ridiculous rate
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=10_000, token_b_in=100_000, shares=100))
        
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=100, token_b_in=100_000_000, shares=100))
        
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=1_000, token_b_in=1_000, shares=100))

        invariant_after = calc_pool_rate(res, pair=0)
        self.assertEqual(invariant_before, invariant_after)   


    def test_tt_fee_is_distributed_evenly(self):
        chain = LocalChain(token_to_token=True)
        # invest equally by Alice and Bob
        res = chain.execute(self.dex.initializeExchange(pair, 100_000, 100_000), sender=alice)
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=100_000, token_b_in=100_000, shares=100), sender=bob)

        # perform a few back and forth swaps
        for i in range(0, 5):
            res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="buy", amount_in=10_000, min_amount_out=1, receiver=julian), amount=1)
            ops = parse_ops(res)
            amount_bought = ops[1]["amount"]
            res = chain.execute(self.dex.tokenToTokenPayment(pair=pair, operation="sell", amount_in=amount_bought, min_amount_out=1, receiver=julian), amount=1)

        # divest alice's shares
        res = chain.execute(self.dex.divestLiquidity(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), sender=alice)
        alice_ops = parse_ops(res)
        alice_profit = alice_ops[1]["amount"] - 100_000
    
        # divest bob's shares
        res = chain.execute(self.dex.divestLiquidity(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), sender=bob)
        bob_ops = parse_ops(res)
        bob_profit = bob_ops[1]["amount"] - 100_000

        # profits are equal +-1 due to rounding errors
        self.assertTrue(alice_profit == bob_profit + 1 or alice_profit == bob_profit - 1)

    def test_tt_fail_divest_nonowner(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.initializeExchange(pair, 100, 100_000))
        
        res = chain.execute(self.dex.investLiquidity(pair=pair, token_a_in=100, token_b_in=100_000, shares=101))
        
        # should fail due to Julian not owning any shares 
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divestLiquidity(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100), sender=julian)