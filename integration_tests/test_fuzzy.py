import unittest

from hypothesis import given, settings, event, strategies as st
from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from contextlib import suppress

from helpers import *


class DexFuzzying(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.maxDiff = None

        dex_code = open("./integration_tests/MockDex.tz", 'r').read()
        cls.dex = ContractInterface.from_michelson(dex_code)

    @given( in_tok=st.integers(1))
    def test_cant_divest_too_much(self, in_tok):
        pass

    @settings(deadline=10_000)
    @given(tokens=st.integers(0), tez=st.integers(0))
    def test_init_never_zero(self, tokens, tez):
        my_address = self.dex.context.get_sender()
        
        chain = LocalChain()
        try:
            res = chain.execute(self.dex.initializeExchange(tokens), amount=tez)
            self.assertNotEqual(res.storage["storage"]["tez_pool"], 0)
        except MichelsonRuntimeError:
            pass
    
    @settings(deadline=10_000, max_examples=10)
    @given( init_tok=st.integers(1),
            init_tez=st.integers(1),
            in_tok=st.integers(1),
            in_tez=st.integers(1),
            out_tok=st.integers(0),
            out_tez=st.integers(0),
            shares=st.integers(0))
    def test_cant_divest_too_much(self,
        init_tok, init_tez,
        in_tok, in_tez,
        out_tok, out_tez,
        shares):
        chain = LocalChain()
        try:
            res = chain.execute(self.dex.initializeExchange(init_tok), amount=init_tez)
            res = chain.execute(self.dex.investLiquidity(in_tok), amount=in_tez)
            res = chain.execute(self.dex.divestLiquidity(min_tez=out_tez, min_tokens=out_tok, shares=shares))
            (tez, tok) = parse_transfers(res)
            self.assertLessEqual(tez, init_tez + in_tez)
            self.assertLessEqual(tok, init_tok + in_tok)

        except MichelsonRuntimeError:
            event(f"invalid_divest")

    @settings(deadline=None)
    @given(votes=st.lists(st.integers(0)),
           vetos=st.lists(st.integers(0)))
    def test_cant_voting_doesnt_mint_shares(self, votes, vetos):
        me = self.dex.context.get_sender()

        chain = LocalChain()
        res = chain.execute(self.dex.initializeExchange(100_000_000), amount=100_000)
        try:
            for i in range(min(len(vetos), len(votes))): 
                vote = votes[i]
                res = chain.execute(self.dex.vote(voter=me,
                    candidate=generate_random_address(),
                    value=vote))

                veto = vetos[i]
                res = chain.execute(self.dex.veto(voter=me,
                    value=vote))

                storage = res.storage["storage"]
                total_balance = calc_total_balance(res, me)
                self.assertEqual(total_balance, 100_000)
        except MichelsonRuntimeError:
            event("MichelsonRuntimeError")


    # @given(sender=st.sampled_from([alice,bob,julian]), receiver=st.sampled_from([alice,bob,julian]))
    # def test_senders_something(self, sender, receiver):
    #     self.assertEquals(True, False)