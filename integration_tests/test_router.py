from unittest import TestCase

import pytest
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

class TokenToTokenTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/MockTTDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)
    
    # TODO check triangle abritrage
    def test_tt_token_to_token_router(self):
        token_a = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_c = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 1,
            "standard": "fa2"
        }
        pair_bc = {
            "token_a_address" : token_b,
            "token_a_id" : 1,
            "token_b_address" : token_c,
            "token_b_id" : 2,
            "standard": "fa12"
        }

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.initializeExchange(pair_ab, 100_000, 100_000))
        res = chain.execute(self.dex.initializeExchange(pair_bc, 100_000, 100_000))

        res = chain.execute(self.dex.tokenToTokenRoutePayment({
            "swaps" : [
                {
                    "pair": pair_ab, 
                    "operation": "sell",
                },
                {
                    "pair": pair_bc, 
                    "operation": "sell",
                }
            ],
            "amount_in" : 100,
            "min_amount_out" : 1, 
            "receiver" : julian
        }))


