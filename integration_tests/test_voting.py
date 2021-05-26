from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal

from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

import time

class DexVotingTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    def test_voting_delegation_works(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)

        res = chain.execute(self.dex.vote(voter=me, \
            candidate=dummy_candidate, \
            value=40))

        delegates = parse_delegations(res)

        self.assertNotEqual(delegates, [])

    def test_sequential_delegation(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100, sender=alice)
        res = chain.execute(self.dex.investLiquidity(100_000), amount=100, sender=bob)

        res = chain.execute(self.dex.vote(voter=alice, \
            candidate=dummy_candidate, \
            value=40), \
            sender=alice)

        delegates = parse_delegations(res)
        self.assertNotEqual(delegates, [])

        res = chain.execute(self.dex.vote(voter=bob, \
            candidate=julian, \
            value=99), \
            sender=bob)

        delegates = parse_delegations(res)
        self.assertNotEqual(delegates, [])

    def test_vote_with_zero(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)
    
        res = chain.execute(self.dex.vote(voter=me, \
            candidate=dummy_candidate, \
            value=0))
        
        delegates = parse_delegations(res)
        self.assertEqual(delegates, [])

    def test_veto_with_zero(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100)

        res = chain.execute(self.dex.veto(voter=me, value=0))
       
        delegates = parse_delegations(res)
        self.assertEqual(delegates, [])

    def test_divest_after_vote(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100), amount=100)
    
        storage_before = res.storage["storage"]
        chain.advance_blocks(1)
        res = chain.execute(self.dex.vote(voter=me, candidate=julian, value=50))

        delegates = parse_delegations(res)
        self.assertNotEqual(delegates, [])

        res = chain.interpret(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=50))

        (tez, tokens) = parse_transfers(res)

        self.assertEqual(tez, 50)
        self.assertEqual(tokens, 50)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=51))

        res = chain.execute(self.dex.vote(voter=me, candidate=julian, value=99))

        res = chain.interpret(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=1))
        (tez, tokens) = parse_transfers(res)

        self.assertEqual(tez, 1)
        self.assertEqual(tokens, 1)

        # unvote everything
        res = chain.execute(self.dex.vote(voter=me, candidate=julian, value=0))

        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=100))
        (tez, tokens) = parse_transfers(res)

        self.assertEqual(tez, 100)
        self.assertEqual(tokens, 100)

    def test_freeze_vote_after_veto(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100), amount=100)
        chain.advance_blocks(1)

        res = chain.execute(self.dex.vote(voter=me, candidate=julian, value=10))

        res = chain.execute(self.dex.veto(voter=me, value=80))
        res = chain.execute(self.dex.vote(voter=me, candidate=dummy_candidate, value=10))
        # res = chain.execute(self.dex.veto(voter=me, value=10))
        res = chain.execute(self.dex.vote(voter=me, candidate=dummy_candidate, value=0))



        # res = chain.execute(self.dex.veto(voter=me, value=0))

        print(res.storage["storage"])

    def test_voting_doesnt_alter_balance(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100), amount=100)

        balance_before = calc_total_balance(res, me)
        
        res = chain.execute(self.dex.vote(voter=me, candidate=julian, value=20))

        balance_after_first_vote = calc_total_balance(res, me)

        res = chain.execute(self.dex.veto(voter=me, value=50))

        balance_after_veto = calc_total_balance(res, me)

        res = chain.execute(self.dex.vote(voter=me, candidate=dummy_candidate, value=0))
        balance_after_second_vote = calc_total_balance(res, me)

        self.assertEqual(balance_before, balance_after_first_vote)
        self.assertEqual(balance_before, balance_after_veto)
        self.assertEqual(balance_before, balance_after_second_vote)