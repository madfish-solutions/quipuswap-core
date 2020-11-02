#define FA2_STANDARD_ENABLED

#include "../partials/Dex.ligo"

function main (const p : full_action; const s : full_dex_storage) : full_return is
  block {
     const this: address = Tezos.self_address; 
  } with case p of
      | Default -> use_default(s) 
      | Use(params) -> middle_dex(params.1, this, params.0, s) 
      | Transfer(params) -> middle_token(ITransfer(params), 0n, s)
      | Balance_of(params) -> middle_token(IBalance_of(params), 1n, s)
      | Token_metadata_registry(params) -> middle_token(IToken_metadata_registry(params), 2n, s)
      | Update_operators(params) -> middle_token(IUpdate_operators(params), 3n, s)
    end