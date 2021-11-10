from os.path import dirname, join
from unittest import TestCase
from decimal import Decimal

import json
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

pair = {
    "token_a_type" : {
        "fa2": {
            "token_address": "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            "token_id": 0
        }
    },
    "token_b_type": {
        "fa2": {
            "token_address": "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC",
            "token_id": 1
        }
    },
}

class TokenToTokenTransferTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/compiled/Dex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

        initial_storage_michelson = json.load(open("./integration_tests/compiled/storage.json", 'r'))
        cls.init_storage = cls.dex.storage.decode(initial_storage_michelson)

    def test_tt_transfer_divest(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair,100_000, 10_000), sender=alice)
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
            res = chain.interpret(self.dex.divest(pair_id=0, min_token_a_out=1, min_token_b_out=1, shares=1, deadline=100), sender=alice)

        # bob successfully divests his shares
        res = chain.execute(self.dex.divest(pair_id=0, min_token_a_out=1, min_token_b_out=1, shares=10_000, deadline=100), sender=bob)

        transfers = parse_token_transfers(res)
        token_a_out_after = transfers[0]["amount"]
        token_b_out_after = transfers[1]["amount"]


        self.assertEqual(token_b_out_after, 100_000)
        self.assertEqual(token_a_out_after, 10_000)

    def test_tt_cant_double_transfer(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair,100_000, 10_000), sender=alice)
        transfer = self.dex.transfer(
            [{ "from_" : alice,
                "txs" : [
                    {
                        "amount": 5_000,
                        "to_": bob,
                        "token_id": 0
                    },
                    {
                        "amount": 6_000,
                        "to_": bob,
                        "token_id": 0
                    }
                ]
            }])
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(transfer, sender=alice)


