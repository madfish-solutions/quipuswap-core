#define FA2_STANDARD_ENABLED
#include "../partials/Dex.ligo"

function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address; 
  } with case p of
      | Default -> use_default(s) 
      | Use(params) -> middle_dex(params, this, s) 
      | Transfer(params) -> middle_token(ITransfer(params), this, 0n, s)
      | Balance_of(params) -> middle_token(IBalance_of(params), this, 2n, s)
      | Token_metadata_registry(params) -> middle_token(IToken_metadata_registry(params), this, 3n, s)
      | Update_operators(params) -> middle_token(IUpdate_operators(params), this, 1n, s)
      // | GetPrices(params) -> ((nil : list(operation)), s)
      // | GetReserves(params) -> ((nil : list(operation)), s)
    end
