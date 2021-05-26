from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal
import math

import pytest
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

class DexTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    def perform_sequence(self, with_actions):
        my_address = self.dex.context.get_sender()

        chain = LocalChain()
        initial_tokens = 1_000_000_000
        initial_tezos = 100_000
        res = chain.execute(self.dex.initializeExchange(initial_tokens), amount=initial_tezos)
        total_shares = res.storage["storage"]["total_supply"]

        res = chain.execute(self.dex.tokenToTezPayment(amount=1_000_000, min_out=1, receiver=alice), amount=0)

        if with_actions:
            chain.execute(self.dex.vote(voter=my_address, \
                candidate=dummy_candidate, \
                value=100), \
                amount=1)

        chain.advance_period()

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=101)

        if with_actions:
            print("pre default tez_pool", res.storage["storage"]["tez_pool"])
            print("pre default contract balance", chain.balance)
            res = chain.execute(self.dex.default(), amount=1_000)
        
        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=1_000), amount=0)

        res = chain.execute(self.dex.tokenToTezPayment(amount=333_333, min_out=1, receiver=alice), amount=0)

        if with_actions:
            chain.execute(self.dex.veto(voter=my_address, \
                value=666), \
                amount=1)
        
        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=10_101)

        chain.advance_period()

        res = chain.execute(self.dex.tokenToTezPayment(amount=150_000, min_out=1, receiver=alice), amount=0)

        if with_actions:
            res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)

        # res = chain.execute(self.dex.investLiquidity(1_000_000), amount=10_000, sender=bob)

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=30_000)

        if with_actions:
            chain.advance_period()
            res = chain.execute(self.dex.withdrawProfit(my_address), sender=my_address)

        return chain


    def test_one_person_comparison(self):
        
        chain = self.perform_sequence(False)
        
        actions_chain = self.perform_sequence(True)

        storage = chain.storage["storage"]
        actions_storage = actions_chain.storage["storage"]

        print("\npayouts", chain.payouts)
        print("\nactions payouts", actions_chain.payouts)

        print("\n storage", storage)
        print("\n actions storage", actions_storage)

        tez_delta = abs(storage["tez_pool"] - actions_storage["tez_pool"])
        token_delta = abs(storage["token_pool"] - actions_storage["token_pool"])
        tez_delta_fraction = tez_delta / storage["tez_pool"]
        token_delta_fraction = token_delta / storage["token_pool"]
        # print("balance", chain.balance)
        # print("actions balance", actions_chain.balance)

        # less than 1% difference due to default enrypoint sync
        self.assertLess(tez_delta_fraction, 0.01) 
        self.assertLess(token_delta_fraction, 0.01)
    


    def two_person_sequence(self, with_actions):
        chain = LocalChain()
        initial_tokens = 100_000_000
        initial_tezos = 1_000_000
        res = chain.execute(self.dex.initializeExchange(initial_tokens), amount=initial_tezos, sender=alice)
        total_shares = res.storage["storage"]["total_supply"]

        chain.advance_blocks(3)

        if with_actions:
            chain.execute(self.dex.vote(voter=alice, candidate=julian, value=100_000), sender=alice)
        
        res = chain.execute(self.dex.tokenToTezPayment(amount=100_000, min_out=1, receiver=bob))

        res = chain.execute(self.dex.investLiquidity(36_369_369), amount=333_333, sender=bob)

        if with_actions:
            chain.execute(self.dex.vote(voter=bob, candidate=dummy_candidate, value=111_111), sender=bob)

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=1_000)

        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=221_000), sender=bob)

        if with_actions:
            res = chain.execute(self.dex.default(), amount=500)

        chain.advance_period() # empty period
        chain.advance_period() # actual period
        res = chain.execute(self.dex.tokenToTezPayment(amount=1_000_000, min_out=1, receiver=bob))

        if with_actions:
            res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
            res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)

        res = chain.execute(self.dex.tezToTokenPayment(min_out=1, receiver=julian), amount=99_999)

        return chain
            
    def test_two_person_comparison(self):
        chain = self.two_person_sequence(False)
        actions_chain = self.two_person_sequence(True)

        storage = chain.storage["storage"]
        actions_storage = actions_chain.storage["storage"]

        print("\npayouts", chain.payouts)
        print("\nactions payouts", actions_chain.payouts)

        print("\n storage", storage)
        print("\n actions storage", actions_storage)

        tez_delta = abs(storage["tez_pool"] - actions_storage["tez_pool"])
        token_delta = abs(storage["token_pool"] - actions_storage["token_pool"])
        tez_delta_fraction = tez_delta / storage["tez_pool"]
        token_delta_fraction = token_delta / storage["token_pool"]
        
        print("balance", chain.balance)
        print("actions balance", actions_chain.balance)

        # less than 1% difference due to default enrypoint sync
        self.assertLess(tez_delta_fraction, 0.01) 
        self.assertLess(token_delta_fraction, 0.01)        


        
