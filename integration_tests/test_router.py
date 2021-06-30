from unittest import TestCase

import pytest
from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from pytezos.context.mixin import ExecutionContext

class TokenToTokenRouterTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/MockTTDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)
    
    # TODO check triangle abritrage
    def test_tt_token_to_token_router(self):
        token_a = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_c = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 1,
            "token_a_type": "fa2",
            "token_b_type": "fa2"
        }
        pair_bc = {
            "token_a_address" : token_b,
            "token_a_id" : 0,
            "token_b_address" : token_c,
            "token_b_id" : 0,
            "token_a_type": "fa12",
            "token_b_type": "fa12"
        }

        amount_in=10_000

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000, 300_000))
        res = chain.execute(self.dex.addPair(pair_bc, 500_000, 700_000))

        # interpret the call without applying it
        res = chain.interpret(self.dex.swap({
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
            "amount_in" : amount_in,
            "min_amount_out" : 1, 
            "receiver" : julian
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
                "pair": pair_ab,
                "operation": "sell",
            }],
            amount_in=amount_in,
            min_amount_out=1,
            receiver=julian
        ))
        transfers = parse_token_transfers(res)
        token_b_out = next(v for v in transfers if v["destination"] == julian)

        res = chain.interpret(self.dex.swap(
             swaps=[{
                "pair": pair_bc,
                "operation": "sell",
            }],
            amount_in=token_b_out["amount"],
            min_amount_out=1,
            receiver=julian
        ))
        transfers = parse_token_transfers(res)
        token_c_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(routed_out["amount"], token_c_out["amount"])
 
    def test_tt_router_triangle(self):
        token_a = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_c = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 1,
            "token_a_type": "fa2",
            "token_b_type": "fa2"
        }
        pair_bc = {
            "token_a_address" : token_b,
            "token_a_id" : 1,
            "token_b_address" : token_c,
            "token_b_id" : 0,
            "token_a_type": "fa2",
            "token_b_type": "fa12"
        }
        pair_ac = {
            "token_a_address" : token_a,
            "token_a_id" : 1,
            "token_b_address" : token_c,
            "token_b_id" : 0,
            "token_a_type": "fa2",
            "token_b_type": "fa12"
        }
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000_000_000, 100_000_000_000))
        res = chain.execute(self.dex.addPair(pair_bc, 100_000_000_000, 100_000_000_000))
        res = chain.execute(self.dex.addPair(pair_ac, 100_000_000_000, 100_000_000_000))

        # interpret the call without applying it
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair": pair_ab, 
                    "operation": "sell",
                },
                {
                    "pair": pair_bc, 
                    "operation": "sell",
                },
                {
                    "pair": pair_ac, 
                    "operation": "buy",
                }
            ],
            "amount_in" : 10_000,
            "min_amount_out" : 1, 
            "receiver" : julian
        }))
        transfers = parse_token_transfers(res)
        
        token_c_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_c_out["amount"], 9909) # ~ 9910 by compound interest formula

    def test_tt_router_rhombus(self):
        token_a = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 1,
            "token_a_type": "fa2",
            "token_b_type": "fa2"
        }
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000_000_000, 100_000_000_000))
        res = chain.interpret(self.dex.swap({
            "swaps" : [
                {
                    "pair": pair_ab, 
                    "operation": "sell",
                },
                {
                    "pair": pair_ab, 
                    "operation": "buy",
                }
            ],
            "amount_in" : 10_000,
            "min_amount_out" : 1, 
            "receiver" : julian
        }))
        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_out["amount"], 9939)

    def test_tt_router_impossible_path(self):
        token_a = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_c = "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA"
        token_d = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 0,
            "token_a_type": "fa2",
            "token_b_type": "fa12"
        }
        pair_cd = {
            "token_a_address" : token_c,
            "token_a_id" : 0,
            "token_b_address" : token_d,
            "token_b_id" : 0,
            "token_a_type": "fa12",
            "token_b_type": "fa2"
        }

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair_ab, 1111, 3333))
        res = chain.execute(self.dex.addPair(pair_cd, 5555, 7777))

        # can't find path
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.swap({
                "swaps" : [
                    {
                        "pair": pair_ab, 
                        "operation": "sell",
                    },
                    {
                        "pair": pair_cd, 
                        "operation": "sell",
                    }
                ],
                "amount_in" : 334,
                "min_amount_out" : 1, 
                "receiver" : julian
            }))

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.interpret(self.dex.swap({
                "swaps" : [
                    {
                        "pair": pair_ab, 
                        "operation": "sell",
                    },
                    {
                        "pair": pair_ab, 
                        "operation": "sell",
                    }
                ],
                "amount_in" : 334,
                "min_amount_out" : 1, 
                "receiver" : julian
            }))


    def test_tt_router_not_enough_liqudity(self):
        token_a = "KT1PgHxzUXruWG5XAahQzJAjkk4c2sPcM3Ca"
        token_b = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"
        token_c = "KT1Wz32jY2WEwWq8ZaA2C6cYFHGchFYVVczC"

        pair_ab = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_b,
            "token_b_id" : 1,
            "token_a_type": "fa2",
            "token_b_type": "fa2"
        }
        pair_bc = {
            "token_a_address" : token_b,
            "token_a_id" : 0,
            "token_b_address" : token_c,
            "token_b_id" : 0,
            "token_a_type": "fa12",
            "token_b_type": "fa12"
        }
        pair_ac = {
            "token_a_address" : token_a,
            "token_a_id" : 0,
            "token_b_address" : token_c,
            "token_b_id" : 0,
            "token_a_type": "fa2",
            "token_b_type": "fa12"
        }

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair_ab, 100_000, 100_000))
        res = chain.execute(self.dex.addPair(pair_bc, 10_000, 10_000))
        res = chain.execute(self.dex.addPair(pair_ac, 1_000_000, 1_000_000))

        # not enough at the very beginning
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.swap({
                "swaps" : [
                    {
                        "pair": pair_ab, 
                        "operation": "sell",
                    }
                ],
                "amount_in" : 51_000,
                "min_amount_out" : 1, 
                "receiver" : julian
            }))

            print(parse_token_transfers(res))

        # not enough at the end
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.swap({
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
                "amount_in" : 10_000,
                "min_amount_out" : 1, 
                "receiver" : julian
            }))
        
        # not enough in the middle
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.swap({
                "swaps" : [
                    {
                        "pair": pair_ab, 
                        "operation": "sell",
                    },
                    {
                        "pair": pair_bc, 
                        "operation": "sell",
                    },
                    {
                        "pair": pair_ac, 
                        "operation": "buy",
                    }
                ],
                "amount_in" : 10_000,
                "min_amount_out" : 1, 
                "receiver" : julian
            }))
       
