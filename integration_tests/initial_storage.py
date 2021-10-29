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
        lambda_json = json.loads(lambda_string)
        
        filename = basename(filepath)
        index = filename.split("-")[0]

        dex_lambdas[int(index)] = lambda_json["bytes"]


    return dex_lambdas

def load_token_lambdas():
    token_lambdas = {}
    lambdas = glob.glob("./integration_tests/compiled/lambdas/token/*.json")
    for filepath in lambdas:
        lambda_string = open(filepath, 'r').read()
        lambda_json = json.loads(lambda_string)
        
        filename = basename(filepath)
        index = filename.split("-")[0]

        token_lambdas[int(index)] = lambda_json["bytes"]


    return token_lambdas


dex_lambdas = load_dex_lambdas()
token_lambdas = load_token_lambdas()

# initial_full_storage = load_initial_storage()