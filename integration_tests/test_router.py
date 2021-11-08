from unittest import TestCase

import json
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

token_a = "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA"
token_b = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
token_c = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
token_d = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

pair_ab = {
    "token_a_type" : {
        "fa2": {
            "token_address": token_a,
            "token_id": 0
        }
    },
    "token_b_type": {
        "fa2": {
            "token_address": token_b,
            "token_id": 1
        }
    },
}

pair_bc = {
    "token_a_type": {
        "fa2": {
            "token_address": token_b,
            "token_id": 1
        }
    },
    "token_b_type" : {
        "fa2": {
            "token_address": token_c,
            "token_id": 2
        }
    }
}

pair_ac = {
    "token_a_type" : {
        "fa2": {
            "token_address": token_a,
            "token_id": 0
        }
    },
    "token_b_type" : {
        "fa2": {
            "token_address": token_c,
            "token_id": 2
        }
    }
}

pair_cd = {
    "token_a_type" : {
        "fa2": {
            "token_address": token_c,
            "token_id": 2
        }
    },
    "token_b_type" : {
        "fa2": {
            "token_address": token_d,
            "token_id": 3
        }
    }
}


class TokenToTokenRouterTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/compiled/Dex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

        initial_storage_michelson = json.load(open("./integration_tests/compiled/storage.json", 'r'))
        cls.init_storage = cls.dex.storage.decode(initial_storage_michelson)
    
    def test_tt_token_to_token_router(self):

        amount_in=10_000

        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000, 300_000))
        res = chain.execute(self.dex.addPair(pair_bc, 500_000, 700_000))

        # interpret the call without applying it
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 1, 
                    "operation": "a_to_b",
                }
            ],
            "amount_in" : amount_in,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))

        transfers = parse_token_transfers(res)
        contract_in = next(v for v in transfers if v["destination"] == contract_self_address)
        self.assertEqual(contract_in["token_address"], token_a)
        self.assertEqual(contract_in["amount"], 10_000)

        routed_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(routed_out["token_address"], token_c)

        # same swap but one by one
        res = chain.interpret(self.dex.swap(
            swaps=[{
                "pair_id": 0,
                "operation": "a_to_b",
            }],
            amount_in=amount_in,
            min_amount_out=1,
            receiver=julian,
            deadline=100_000
        ))
        transfers = parse_token_transfers(res)
        token_b_out = next(v for v in transfers if v["destination"] == julian)

        res = chain.interpret(self.dex.swap(
             swaps=[{
                "pair_id": 1,
                "operation": "a_to_b",
            }],
            amount_in=token_b_out["amount"],
            min_amount_out=1,
            receiver=julian,
            deadline=100_000,
        ))
        transfers = parse_token_transfers(res)
        token_c_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(routed_out["amount"], token_c_out["amount"])
 
    def test_tt_router_triangle(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000_000_000, 100_000_000_000))
        res = chain.execute(self.dex.addPair(pair_bc, 100_000_000_000, 100_000_000_000))
        res = chain.execute(self.dex.addPair(pair_ac, 100_000_000_000, 100_000_000_000))

        # interpret the call without applying it
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 1, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 2, 
                    "operation": "b_to_a",
                }
            ],
            "amount_in" : 10_000,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))
        transfers = parse_token_transfers(res)
        
        token_c_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_c_out["amount"], 9909) # ~ 9910 by compound interest formula

    def test_tt_router_ab_ba(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000_000_000, 100_000_000_000))
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 0, 
                    "operation": "b_to_a",
                }
            ],
            "amount_in" : 10_000,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))
        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_out["amount"], 9939)

    def test_tt_router_impossible_path(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 1111, 3333))
        res = chain.execute(self.dex.addPair(pair_cd, 5555, 7777))

        # can't find path
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.swap({
                "swaps" : [
                    {
                        "pair_id": 0, 
                        "operation": "a_to_b",
                    },
                    {
                        "pair_id": 1, 
                        "operation": "a_to_b",
                    }
                ],
                "amount_in" : 334,
                "min_amount_out" : 1, 
                "receiver" : julian,
                "deadline": 100_000
            }))

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.swap({
                "swaps" : [
                    {
                        "pair_id": 0, 
                        "operation": "a_to_b",
                    },
                    {
                        "pair_id": 0, 
                        "operation": "a_to_b",
                    }
                ],
                "amount_in" : 334,
                "min_amount_out" : 1, 
                "receiver" : julian,
                "deadline": 100_000
            }))


    def test_tt_router_cant_overbuy(self):
        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000, 100_000))
        res = chain.execute(self.dex.addPair(pair_bc, 10_000, 10_000))
        res = chain.execute(self.dex.addPair(pair_ac, 1_000_000, 1_000_000))

        # overbuy at the very beginning
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                }
            ],
            "amount_in" : 100_000_000_000,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))

        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_out["amount"], 99_999)

        # overbuy at the end
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 1, 
                    "operation": "a_to_b",
                }
            ],
            "amount_in" : 100_000_000,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))
        
        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertLess(token_out["amount"], 9_999)
    
        # overbuy in the middle
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 1, 
                    "operation": "a_to_b",
                },
                {
                    "pair_id": 2, 
                    "operation": "b_to_a",
                }
            ],
            "amount_in" : 10_000_000_000,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))

        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertLess(token_out["amount"], 9_999)
       

    def test_tt_router_mixed_fa2_fa12(self):
        pair_ab = {
            "token_a_type" : {
                "fa12": token_b,
            },
            "token_b_type": {
                "fa2": {
                    "token_address": token_a,
                    "token_id": 1
                }
            },
        }

        pair_bc = {
            "token_a_type" : {
                "fa12": token_b,
            },
            "token_b_type" : {
                "fa2": {
                    "token_address": token_c,
                    "token_id": 2
                }
            }
        }

        amount_in=10_000

        chain = LocalChain(storage=self.init_storage)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000, 300_000))
        res = chain.execute(self.dex.addPair(pair_bc, 500_000, 700_000))

        # interpret the call without applying it
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair_id": 0, 
                    "operation": "b_to_a",
                },
                {
                    "pair_id": 1, 
                    "operation": "a_to_b",
                }
            ],
            "amount_in" : amount_in,
            "min_amount_out" : 1, 
            "receiver" : julian,
            "deadline": 100_000
        }))

        transfers = parse_token_transfers(res)
        contract_in = next(v for v in transfers if v["destination"] == contract_self_address)
        self.assertEqual(contract_in["token_address"], token_a)
        self.assertEqual(contract_in["amount"], 10_000)

        routed_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(routed_out["token_address"], token_c)
