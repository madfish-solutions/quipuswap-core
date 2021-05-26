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

    def test_empty_update_operators(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)
        storage_before = res.storage["storage"]

        res = chain.execute(self.dex.update_operators([]))

        storage_after = res.storage["storage"]

        self.assertDictEqual(storage_before, storage_after)

    def test_allow_basic(self):
        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000), amount=10_000, sender=alice)
        
        res = chain.execute(self.dex.update_operators([operator_add(alice, bob)]), sender=alice)

        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [{
                    "amount": 5_000,
                    "to_": julian,
                    "token_id": 0
                }]
            }])

        res = chain.execute(transfer, sender=bob)

        (tez_amount, token_amount) = parse_transfers(res)

        storage = res.storage["storage"]

        self.assertEqual(storage["ledger"][julian]["balance"], 5000)
        self.assertEqual(storage["ledger"][alice]["balance"], 5000)
        self.assertNotIn(bob, storage["ledger"])
    