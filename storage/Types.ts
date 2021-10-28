import { MichelsonMap, MichelsonMapKey } from "@taquito/michelson-encoder";
import { BigNumber } from "bignumber.js";

export type DexStorage = {
  storage: {
    pairs_count: BigNumber;
    tokens: MichelsonMap<MichelsonMapKey, unknown>;
    token_to_id: MichelsonMap<MichelsonMapKey, unknown>;
    pairs: MichelsonMap<MichelsonMapKey, unknown>;
    ledger: MichelsonMap<MichelsonMapKey, unknown>;
  };
  metadata: MichelsonMap<MichelsonMapKey, unknown>;
  dex_lambdas: MichelsonMap<MichelsonMapKey, unknown>;
  token_lambdas: MichelsonMap<MichelsonMapKey, unknown>;
};
