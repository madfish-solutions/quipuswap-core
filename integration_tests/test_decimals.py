from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal

import pytest
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

class DexTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    def test_huge(self):
        chain = LocalChain()
        initial_tokens = 10**127
        initial_tezos = 10**18
        res = chain.execute(self.dex.initializeExchange(initial_tokens), amount=initial_tezos)
        total_shares = res.storage["storage"]["total_supply"]
        
        # ================================= tez -> token -> tez =================================
        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=10**15)
        ops = parse_ops(res)
        tokens_received = ops[0]["amount"]

        res = chain.execute(self.dex.tokenToTezPayment(amount=tokens_received, min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=0)

        # ================================= token -> tez -> token =================================
        # res = chain.execute(self.dex.tokenToTezPayment(amount=10_000, min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=0)
        
        # ops = parse_ops(res)
        # tez_received = ops[1]["amount"]

        # # swap the received tezos back to tokens
        # res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=tez_received)

        # print(res.storage["storage"])

        # ================================= divest =================================
        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=total_shares), amount=0)

        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        self.assertGreaterEqual(ops[0]["amount"], initial_tokens) 

        self.assertEqual(ops[1]["type"], "tez")
        # ensure we got more tez cause it should include some fee
        self.assertGreater(ops[1]["amount"], initial_tezos)

    def test_lots_of_tokens(self):
        chain = LocalChain()
        initial_tokens = 10**255
        initial_tezos = 100
        res = chain.execute(self.dex.initializeExchange(initial_tokens), amount=initial_tezos)
        total_shares = res.storage["storage"]["total_supply"]
        
        # ================================= tez -> token -> tez =================================
        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=10)
        ops = parse_ops(res)
        tokens_received = ops[0]["amount"]

        res = chain.execute(self.dex.tokenToTezPayment(amount=tokens_received, min_out=1, receiver="tz1MDhGTfMQjtMYFXeasKzRWzkQKPtXEkSEw"), amount=0)

        # ================================= divest =================================
        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=total_shares), amount=0)
        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        self.assertGreaterEqual(ops[0]["amount"], initial_tokens) 

        self.assertEqual(ops[1]["type"], "tez")
        self.assertGreaterEqual(ops[1]["amount"], initial_tezos)

    def test_lots_of_tezos(self):
        chain = LocalChain()
        initial_tokens = 100
        initial_tezos = 10**18
        res = chain.execute(self.dex.initializeExchange(initial_tokens), amount=initial_tezos)
        total_shares = res.storage["storage"]["total_supply"]
        
        # ================================= tez -> token -> tez =================================
        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=10**17)
        ops = parse_ops(res)

        (_, tokens_received) = parse_transfers(res)

        res = chain.execute(self.dex.tokenToTezPayment(amount=tokens_received, min_out=1, receiver=julian), amount=0)
        
        # ================================= divest =================================
        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=total_shares), amount=0)
        ops = parse_ops(res)

        self.assertEqual(ops[0]["type"], "token")
        self.assertGreaterEqual(ops[0]["amount"], initial_tokens) 

        self.assertEqual(ops[1]["type"], "tez")
        # ensure we got more tez cause it should include some fee
        self.assertGreater(ops[1]["amount"], initial_tezos)


    def test_decimals_gap_one_mutoken(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(1_000_000_000), amount=100_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTezPayment(amount=1, min_out=1, receiver=julian))
        
    def test_decimals_gap_one_mutez(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(1_000), amount=10_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=alice), amount=1)

    def test_divest_small_tez_big_token(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000_000), amount=50, sender=alice)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.investLiquidity(2_000_000 - 1), amount=1)

        res = chain.execute(self.dex.investLiquidity(3_600_000), amount=1)
        (tez, tok) = parse_transfers(res)
        self.assertEqual(tok, 2_000_000)

        all_shares = calc_total_balance(res, me)

        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=all_shares))
        (tez, tok) = parse_transfers(res)

        self.assertEqual(tez, 1)
        self.assertEqual(tok, 2_000_000)


    def test_divest_big_tez_small_token(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(50), amount=100_000_000, sender=alice)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.investLiquidity(1), amount=3_600_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.investLiquidity(2), amount=4_000_001)

        res = chain.execute(self.dex.investLiquidity(3), amount=4_000_001)
        (tez, tok) = parse_transfers(res)
        self.assertEqual(tok, 3)

        all_shares = calc_total_balance(res, me)
        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=all_shares))
        (tez, tok) = parse_transfers(res)
        self.assertEqual(tok, 2)
        self.assertEqual(tez, 4_000_001)
        

    def test_swap_small_amounts(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(10), amount=6)

        # res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=alice), amount=1)
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.tokenToTezPayment(amount=1, min_out=1, receiver=alice), amount=0)



    