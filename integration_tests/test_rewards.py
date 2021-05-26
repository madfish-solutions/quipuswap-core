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

    def test_rewards_timing(self):
        me = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100), amount=100)
        chain.advance_blocks(1)
        res = chain.execute(self.dex.default(), amount=100)

        chain.advance_period()

        res = chain.execute(self.dex.withdrawProfit(me))

        (tez_profit, _) = parse_transfers(res)
        self.assertEqual(tez_profit, None)


        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(me))
        (tez_profit, _) = parse_transfers(res)

        self.assertEqual(tez_profit, 99)

        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(me))
        (tez_profit, _) = parse_transfers(res)
        self.assertEqual(tez_profit, None)


    def test_often_withdrawing(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100, sender=julian)

        res = chain.execute(self.dex.investLiquidity(100_000), amount=100, sender=alice)

        res = chain.execute(self.dex.investLiquidity(100_000), amount=100, sender=bob)
    
        res = chain.execute(self.dex.default(), amount=333)
        
        # alice withdraws every period
        total_alice_profit = 0
        for i in range(0, 14):
            chain.advance_blocks(60 * 24)
            res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
            (alice_profit, _) = parse_transfers(res)
            total_alice_profit += alice_profit

        # chain.advance_period()
        # bob waits till the end of period
        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (bob_profit, _) = parse_transfers(res)

        self.assertEqual(total_alice_profit, bob_profit)
    
    def test_untimely_reward(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=100, sender=julian)

        res = chain.execute(self.dex.investLiquidity(100_000), amount=100, sender=alice)

        res = chain.execute(self.dex.investLiquidity(100_000), amount=100, sender=bob)
    
        res = chain.execute(self.dex.default(), amount=333)
        
        # alice withdraws every period
        total_alice_profit = 0
        for i in range(0, 4):
            chain.advance_period()
            res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
            (alice_profit, _) = parse_transfers(res)
            total_alice_profit += alice_profit

            if i == 0:
                res = chain.execute(self.dex.withdrawProfit(julian), sender=julian)
                (first_julian_profit, _) = parse_transfers(res)
            
            res = chain.execute(self.dex.default(), amount=1_000_000)
        
        # bob skips all the periods and then profits
        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (bob_profit, _) = parse_transfers(res)

        res = chain.execute(self.dex.withdrawProfit(julian), sender=julian)
        (second_julian_profit, _) = parse_transfers(res)

        total_julian_profit = first_julian_profit + second_julian_profit

        self.assertEqual(total_alice_profit, total_julian_profit)
        self.assertEqual(total_alice_profit, bob_profit)


    
    