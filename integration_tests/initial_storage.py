import json
import glob
from os.path import dirname, join, basename
from pytezos.michelson.format import micheline_to_michelson


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
    lambdas = glob.glob("./integration_tests/compiled/lambdas/dex/*.json")
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

def load_token_lambdas():
    token_lambdas = {}
    lambdas = glob.glob("./integration_tests/compiled/lambdas/token/*.json")
    for filepath in lambdas:
        lambda_string = open(filepath, 'r').read()
        micheline = json.loads(lambda_string)
        
        # HACK to extract the function from parameter
        # e.g. `initialize_exchange` part from `SetTokenFunction(initialize_exchange, 0n)`
        # their amount might be the value to tinker with if you get cryptic storage errors like `expected list got dict` and such
        lambda_code = micheline["args"][0]["args"][0]["args"][0]["args"][0]

        michelson_code = micheline_to_michelson(lambda_code)

        filename = basename(filepath)
        index = filename.split("-")[0]

        token_lambdas[int(index)] = michelson_code

        # left here in case it is necessary to do the same by entrypoint
        # dex.setTokenFunction(michelson_code, int(index)).interpret

    return token_lambdas

dex_lambdas = load_dex_lambdas()
token_lambdas = load_token_lambdas()

initial_full_storage = {
    'dex_lambdas': dex_lambdas,
    'token_lambdas': token_lambdas,
    'metadata': {},
    'storage': None
}