import json
import glob
from os.path import dirname, join, basename
from pytezos.michelson.format import micheline_to_michelson


initial_storage = dict(
    token_id = 0,
    tez_pool = 0,
    token_pool = 0,
    total_supply = 0,
    token_address = "tz1irF8HUsQp2dLhKNMhteG1qALNU9g3pfdN",
    ledger = {},
    voters = {},
    vetos = {},
    votes = {},
    baker_validator = "tz1ZZZZZZZZZZZZZZZZZZZZZZZZZZZZNkiRg",
    veto = 0,
    last_veto = 0,
    current_delegated = None,
    current_candidate = None,
    total_votes = 0,
    total_reward = 0,
    reward_paid = 0,
    reward = 0,
    reward_per_share = 0,
    last_update_time = 0,
    period_finish = 0,
    reward_per_sec = 0,
    user_rewards = {},
)

initial_tt_storage = dict(
    entered = False,
    pairs_count=0,
    tokens = {},
    token_to_id = {},
    pairs = {},
    ledger = {},
)


def make_full_storage(internal_storage):
    full_storage = initial_full_storage
    full_storage["storage"] = internal_storage
    return full_storage

def load_dex_lambdas():
    dex_lambdas = {}
    lambdas = glob.glob("./integration_tests/lambdas/*.json")
    for filepath in lambdas:
        lambda_string = open(filepath, 'r').read()
        micheline = json.loads(lambda_string)
        
        # HACK to extract the function from parameter
        # e.g. `initialize_exchange` part from `SetDexFunction(initialize_exchange, 0n)` 
        lambda_code = micheline["args"][0]["args"][0]["args"][0]["args"][0]

        michelson_code = micheline_to_michelson(lambda_code)

        filename = basename(filepath)
        index = filename.split("-")[0]

        dex_lambdas[int(index)] = michelson_code

        # left here in case it is necessary to do the same by entrypoint
        # dex.setDexFunction(michelson_code, int(index)).interpret

    return dex_lambdas

dex_lambdas = load_dex_lambdas()
token_lambdas = {}

initial_full_storage = {
    'dex_lambdas': dex_lambdas,
    'token_lambdas': token_lambdas,
    'metadata': {},
    'storage': None
}