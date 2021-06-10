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

        dex_code = open("./MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    def test_transfer_divest(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)
        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 10_000,
                    "to_": bob,
                    "token_id": 0
                }]
            }])
        
        res = chain.execute(transfer, sender=alice)

        # alice cant divest a single share after transfer
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=1), sender=alice)

        res = chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=10_000), sender=bob)

        (tez_amount, token_amount) = parse_transfers(res)

        self.assertEqual(tez_amount, 10_000)
        self.assertEqual(token_amount, 100_000)

    def test_transfer_rewards(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)

        chain.advance_blocks(1)

        res = chain.execute(self.dex.default(), amount=100)
        chain.advance_period()
        chain.advance_period()

        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 5_000,
                    "to_": bob,
                    "token_id": 0
                }]
            }])
        
        res = chain.execute(transfer, sender=alice)
        
        # total_alice_profit = 0
        # total_bob_profit = 0

        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (bob_tez, _) = parse_transfers(res)
        # total_bob_profit = bob_tez


        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        (alice_tez, _) = parse_transfers(res)
        print(parse_transfers(res))
        # total_alice_profit += alice_tez

        print("alice tez", alice_tez)
        print("bob tez", bob_tez)
        # print("\nstrg", res.storage["storage"])

        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        (alice_tez, _) = parse_transfers(res)

        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (bob_tez, _) = parse_transfers(res)
        print("alice tez after", alice_tez)
        print("bob tez after", bob_tez)


        chain.advance_period()
        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        (alice_tez, _) = parse_transfers(res)

        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (bob_tez, _) = parse_transfers(res)
        print("alice tez after all", alice_tez)
        print("bob tez after all", bob_tez)
        
    def test_self_to_self(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)
        res = chain.execute(self.dex.investLiquidity(100_000), amount=10_000, sender=bob)

        res = chain.execute(self.dex.default(), amount=100)
        chain.advance_period()

        res = chain.execute(self.dex.vote(voter=alice, candidate=julian, value=5_000), sender=alice)

        res = chain.interpret(self.dex.withdrawProfit(alice), sender=alice)
        (alice_tez, _) = parse_transfers(res)

        res = chain.interpret(self.dex.withdrawProfit(bob), sender=bob)
        (bob_tez, _) = parse_transfers(res)

        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 5_000,
                    "to_": alice,
                    "token_id": 0
                }]
            }])
        
        # with self.assertRaises(MichelsonRuntimeError):
        res = chain.execute(transfer, sender=alice)

        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        (new_alice_tez, _) = parse_transfers(res)
        print("new alice tez", new_alice_tez)

        res = chain.execute(self.dex.withdrawProfit(bob), sender=bob)
        (new_bob_tez, _) = parse_transfers(res)

        self.assertEqual(alice_tez, new_alice_tez)
        self.assertEqual(bob_tez, new_bob_tez)

        old_storage = res.storage["storage"]
        # old_user_rewards = old_storage["user_rewards"]
        res = chain.execute(transfer, sender=alice)

        res = chain.execute(self.dex.withdrawProfit(alice), sender=alice)
        (tez, tok) = parse_transfers(res)
        print("alice tez", tez, "tokens", tok)

        self.assertDictEqual(res.storage["storage"], old_storage)


    def test_cant_double_transfer(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)

        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 10_000,
                    "to_": bob,
                    "token_id": 0
                },
                {
                    "amount": 10_000,
                    "to_": bob,
                    "token_id": 0
                },
                {
                    "amount": 10_000,
                    "to_": bob,
                    "token_id": 0
                }]
            }])
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(transfer, sender=alice)
