from pytezos import ContractInterface, pytezos, MichelsonRuntimeError
from hypothesis.stateful import Bundle, RuleBasedStateMachine, rule, invariant, precondition, initialize
from hypothesis import Verbosity, given, settings, event, strategies as st

from helpers import *

MUTEZ_RULE = st.integers(min_value=1, max_value=pow(2,63))

@settings(
    verbosity=Verbosity.verbose,
    deadline=10_000,
    stateful_step_count=100,
    max_examples=10
)
class DivNotExceedInv(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        dex_code = open("./integration_tests/MockDex.tz", 'r').read()
        self.dex = ContractInterface.from_michelson(dex_code)
        self.me = self.dex.context.get_sender()
        self.chain = LocalChain()
        self.balance = dict(tez=0, tok=0)
        self.init = False


    # @precondition(lambda self: self.init == False)
    @initialize(tok_in=st.integers(1), tez_in=MUTEZ_RULE)
    def initExchange(self, tok_in, tez_in):
        res = self.chain.execute(self.dex.initializeExchange(tok_in), amount=tez_in, sender=alice)
        self.init = True


    # @precondition(lambda self: self.init == True)
    @rule(tok_in=st.integers(1), tez_in=MUTEZ_RULE)
    def invest(self, tok_in, tez_in):
        try:
            res = self.chain.execute(self.dex.investLiquidity(tok_in), amount=tez_in)
            self.balance["tez"] += tez_in
            self.balance["tok"] += tok_in
        except MichelsonRuntimeError:
            event("invest not allowed")

    @precondition(lambda self: self.me in self.chain.storage["storage"]["ledger"])
    @rule(shares_out=st.integers(1))
    def divest(self, shares_out):
        try:
            res = self.chain.execute(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=shares_out))
            (tez, tok) = parse_transfers(res)

            self.balance["tez"] -= tez
            self.balance["tok"] -= tok
        except MichelsonRuntimeError:
            event("divest not allowed")

    # @precondition(lambda self: self.chain.storage["finishTime"] != 0)
    @invariant()
    def divested_not_exceed_invested(self):
        ledgers = self.chain.storage["storage"]["ledger"]
        if not self.me in ledgers:
            return
        my_ledger = ledgers[self.me]
        my_shares = my_ledger["balance"]
        try:
            res = self.chain.interpret(self.dex.divestLiquidity(min_tez=1, min_tokens=1, shares=my_shares))
            (tez, tok) = parse_transfers(res)

            assert tez <= self.balance["tez"]
            assert tok <= self.balance["tok"]
        except:
            event("invariant divest not allowed")

    # @invariant()
    # def can_freeze(self):
    #     assert self.chain.balance != 0


DivestedNotExceedInvested = DivNotExceedInv.TestCase