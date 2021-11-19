import { MichelsonMap } from "@taquito/michelson-encoder";
import accounts from "../scripts/sandbox/accounts";

let totalSupply = "10000000";

export const fa12TokenStorage: any = {
  owner: accounts.alice.pkh,
  total_supply: totalSupply,
  ledger: MichelsonMap.fromLiteral({
    [accounts.alice.pkh]: {
      balance: totalSupply,
      allowances: MichelsonMap.fromLiteral({}),
    },
  }),
};
