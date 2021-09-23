import pytest
from unittest import TestCase

import math
import json
import copy

from helpers import *

from pytezos import ContractInterface, pytezos, MichelsonRuntimeError

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

class TokenToTokenTest(TestCase):

    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None
        dex_code = open("./integration_tests/compiled/Dex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)


    def test_tt_dex_init(self):
        chain = LocalChain(True)

        res = chain.execute(self.dex.addPair(pair, 10_000, 10_000), sender=julian)
        
        print(res.storage["storage"])

    def test_tt_dex_swap_and_divest(self):
        my_address = self.dex.context.get_sender()
        chain = LocalChain(True)

        res = chain.execute(self.dex.addPair(pair, 100_000, 100_000))
        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=10_000, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)
        amount_bought = ops[1]["amount"]

        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=amount_bought, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)

        res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), amount=0)
        
        transfers = parse_token_transfers(res)
        self.assertGreaterEqual(transfers[0]["amount"], 100_000) 
        self.assertGreaterEqual(transfers[1]["amount"], 100_000)

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=100, min_amount_out=1, receiver=julian), amount=1)

    def test_cant_init_already_init(self):
        chain = LocalChain(True)

        res = chain.execute(self.dex.addPair(pair, 100_000, 100_000))
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.addPair(pair, 100_000, 10_000))

    def test_tt_propotions(self):
        init_supply_a = 100
        init_supply_b = 10**127
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, init_supply_a, init_supply_b))
        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=1, min_amount_out=1, receiver=julian), amount=1)
        ops = parse_ops(res)
        amount_bought = ops[1]["amount"]

        print(res.storage["storage"])


    def test_two_pairs_dont_interfere(self):
        second_pair = copy.deepcopy(pair)
        second_pair["token_b_type"]["fa2"]["token_id"] += 1

        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100_000_000, 100_000))
        res = chain.execute(self.dex.addPair(second_pair, 10_000, 100_000))

        res = chain.interpret(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=100, min_amount_out=1, receiver=julian))
        transfers = parse_token_transfers(res)
        token_a_out_before = transfers[0]["amount"]
        token_b_out_before = transfers[1]["amount"]

        # perform a swap on the second pair
        res = chain.execute(self.dex.swap(swaps=[dict(pair=second_pair, operation="b_to_a")], amount_in=100, min_amount_out=1, receiver=julian))

        res = chain.execute(self.dex.swap(swaps=[dict(pair=second_pair, operation="a_to_b")], amount_in=1, min_amount_out=1, receiver=julian))

        # ensure first token price in unscathed
        res = chain.interpret(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=100, min_amount_out=1, receiver=julian))
        transfers = parse_token_transfers(res)
        token_a_out_after = transfers[0]["amount"]
        token_b_out_after = transfers[1]["amount"]

        self.assertEqual(token_a_out_before, token_a_out_after)
        self.assertEqual(token_b_out_before, token_b_out_after)


    def test_tt_uninitialized(self):
        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.invest(pair=pair, token_a_in=10_000, token_b_in=10_000, shares=10_000).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=10, min_amount_out=10, receiver=julian).interpret(amount=1)

        with self.assertRaises(MichelsonRuntimeError):
            res = self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=10, min_amount_out=10, receiver=julian).interpret(amount=1)

    def test_tt_fee_is_distributed_evenly(self):
        chain = LocalChain(token_to_token=True)
        # invest equally by Alice and Bob
        res = chain.execute(self.dex.addPair(pair, 100_000, 100_000), sender=alice)
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100_000, token_b_in=100_000, shares=100_000), sender=bob)

        # perform a few back and forth swaps
        for i in range(0, 5):
            res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=10_000, min_amount_out=1, receiver=julian), amount=1)
            ops = parse_ops(res)
            amount_bought = ops[1]["amount"]
            res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=amount_bought, min_amount_out=1, receiver=julian), amount=1)

        # divest alice's shares
        res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), sender=alice)
        alice_ops = parse_ops(res)
        alice_profit = alice_ops[1]["amount"] - 100_000
    
        # divest bob's shares
        res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100_000), sender=bob)
        bob_ops = parse_ops(res)
        bob_profit = bob_ops[1]["amount"] - 100_000

        # profits are equal +-1 due to rounding errors
        self.assertTrue(alice_profit == bob_profit + 1 or alice_profit == bob_profit - 1)

    def test_tt_fail_divest_nonowner(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100, 100_000))
        
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100, token_b_in=100_000, shares=100))
        
        # should fail due to Julian not owning any shares 
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=100), sender=julian)

    def test_tt_amount(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100_000, 100_000))

        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=10_000, min_amount_out=1, receiver=julian))

        transfers = parse_token_transfers(res)
        print(transfers)

    def test_tt_same_token_in_pair(self):
        chain = LocalChain(token_to_token=True)
        
        pair_fa12 = {
            "token_a_type" : {
                "fa12": "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            },
            "token_b_type": {
                "fa12": "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
            },
        }

        pair_fa2 = {
            "token_a_type" : {
                "fa2": {
                    "token_address": "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
                    "token_id": 0
                }
            },
            "token_b_type": {
                "fa2": {
                    "token_address": "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton",
                    "token_id": 0
                }
            },
        }

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.addPair(pair_fa12, 100_000, 200_000_000))

        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.addPair(pair_fa2, 100_000, 200_000_000))
        
    def test_tt_small_amounts(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 10, 10))

        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=2, min_amount_out=1, receiver=julian))

        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)
        self.assertEqual(token_out["amount"], 1)

    
    def test_tt_multiple_singular_invests(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 10, 10), sender=alice)
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=1, shares=1))
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=1, shares=1))
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=1, shares=1))
        
        res = chain.execute(self.dex.divest(pair, 1, 1, 3))

        transfers = parse_token_transfers(res)
        self.assertEqual(transfers[0]["amount"], 3)
        self.assertEqual(transfers[1]["amount"], 3)

    def test_tt_miniscule_amounts(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 2, pow(10, 128)))

        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="a_to_b")], amount_in=1, min_amount_out=1, receiver=julian))

        transfers = parse_token_transfers(res)
        token_out = next(v for v in transfers if v["destination"] == julian)


    def test_tt_multiple_small_invests(self):
        chain = LocalChain(token_to_token=True)

        ratios = [1, 0.01, 100]

        for ratio in ratios:
            res = chain.execute(self.dex.addPair(pair, 100, int(100 * ratio)))

            for i in range(3):
                token_b_amount = int(100 * ratio)
                shares = calc_shares(100, token_b_amount) 
                res = chain.execute(self.dex.invest(pair=pair, token_a_in=100, token_b_in=token_b_amount, shares=shares))

            all_shares = res.storage["storage"]["ledger"][(me,0)]["balance"]

            res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=all_shares))

            transfers = parse_token_transfers(res)
            self.assertEqual(transfers[0]["amount"], int(400 * ratio))
            self.assertEqual(transfers[1]["amount"], 400)


    def test_tt_divest_big_a_small_b(self):
        me = self.dex.context.get_sender()
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100_000_000, 50), sender=alice)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.invest(pair=pair, token_a_in=2_000_000 - 1, token_b_in=1, shares=1))

        res = chain.execute(self.dex.invest(pair=pair, token_a_in=3_600_000, token_b_in=1, shares=1))
        transfers = parse_token_transfers(res)
        self.assertEqual(transfers[1]["amount"], 1)
        self.assertEqual(transfers[0]["amount"], 2_000_000)

        all_shares = res.storage["storage"]["ledger"][(me,0)]["balance"]
        res = chain.execute(self.dex.divest(pair, 1, 1, all_shares))
        transfers = parse_token_transfers(res)
        self.assertEqual(transfers[0]["amount"], 1)
        self.assertEqual(transfers[1]["amount"], 2_000_000)

    def test_tt_divest_small_a_big_b(self):
        me = self.dex.context.get_sender()
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 50, 100_000_000), sender=alice)
        
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=2_000_000 - 1, shares=1))

        res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=3_600_000, shares=1))
        transfers = parse_token_transfers(res)
        self.assertEqual(transfers[1]["amount"], 2_000_000)
        self.assertEqual(transfers[0]["amount"], 1)

        all_shares = res.storage["storage"]["ledger"][(me,0)]["balance"]
        res = chain.execute(self.dex.divest(pair, 1, 1, all_shares))
        transfers = parse_token_transfers(res)
        self.assertEqual(transfers[0]["amount"], 2_000_000)
        self.assertEqual(transfers[1]["amount"], 1)

    def test_tt_reinitialize(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 10, 10))
        res = chain.execute(self.dex.divest(pair, 1, 1, 10))

        # following fails
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.invest(pair, 10, 10, 1))

        res = chain.execute(self.dex.addPair(pair, 10, 10))

    def test_tt_divest_smallest(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 3, 3), sender=alice)
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=2, token_b_in=2, shares=2))

        res = chain.execute(self.dex.swap([dict(pair=pair, operation="a_to_b")], 2, 1, julian), sender=julian)
        print("between pool", res.storage["storage"]["pairs"][0])

        res = chain.execute(self.dex.divest(pair, 1, 1, 3), sender=alice)
        transfers = parse_token_transfers(res)
        print("\nalice withdraw", transfers[1]["amount"], transfers[0]["amount"])

        res = chain.execute(self.dex.divest(pair, 1, 1, 2))
        transfers = parse_token_transfers(res)
        print("my withdraw", transfers[1]["amount"], transfers[0]["amount"])

        print("\nalt chain")
        altchain = LocalChain(token_to_token=True)

        res = altchain.execute(self.dex.addPair(pair, 3, 3), sender=alice)
        res = altchain.execute(self.dex.invest(pair=pair, token_a_in=2, token_b_in=2, shares=2))

        res = altchain.execute(self.dex.swap([dict(pair=pair, operation="a_to_b")], 2, 1, julian), sender=julian)

        res = altchain.execute(self.dex.divest(pair, 1, 1, 2))
        transfers = parse_token_transfers(res)
        print("\nmy withdraw", transfers[1]["amount"], transfers[0]["amount"])

        res = altchain.execute(self.dex.divest(pair, 1, 1, 3), sender=alice)
        transfers = parse_token_transfers(res)
        print("alice withdraw", transfers[1]["amount"], transfers[0]["amount"])

    def test_tt_invest_min_a_shares(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100, 100_000))

        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100, token_b_in=100_000, shares=99))
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100, token_b_in=100_000, shares=100))
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.invest(pair=pair, token_a_in=100, token_b_in=100_000, shares=101))

    def test_tt_invest_min_b_shares(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 100_000, 100))

        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100_000, token_b_in=100, shares=99))
        res = chain.execute(self.dex.invest(pair=pair, token_a_in=100_000, token_b_in=100, shares=100))
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.invest(pair=pair, token_a_in=100_000, token_b_in=100, shares=101))
            

    def test_tt_invest_smallest(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 10, 10))

        with self.assertRaises(MichelsonRuntimeError):
           res = chain.execute(self.dex.invest(pair=pair, token_a_in=2, token_b_in=3, shares=3))

        with self.assertRaises(MichelsonRuntimeError):
           res = chain.execute(self.dex.invest(pair=pair, token_a_in=3, token_b_in=2, shares=3))

    def test_tt_invert_proportion(self):
        chain = LocalChain(token_to_token=True)
        res = chain.execute(self.dex.addPair(pair, 51, 49))

        total_shares = res.storage["storage"]["ledger"][(me,0)]["balance"]
        self.assertEqual(total_shares, 49)

        # we can invest 1:1 token yet
        # res = chain.interpret(self.dex.invest(pair=pair, token_a_in=1, token_b_in=1, shares=1))


        res = chain.execute(self.dex.swap(swaps=[dict(pair=pair, operation="b_to_a")], amount_in=4, min_amount_out=1, receiver=alice), sender=alice)
        ops = parse_ops(res)
        amount_bought = ops[1]["amount"]
        
        # there are 48 tokens on one side, so no way to divest 1 whole share
        with self.assertRaises(MichelsonRuntimeError):
            res = chain.execute(self.dex.divest(pair=pair, min_token_a_out=1, min_token_b_out=1, shares=1))

        # TODO why can't we invest one-to-one?
        # res = chain.execute(self.dex.invest(pair=pair, token_a_in=1, token_b_in=1, shares=1))