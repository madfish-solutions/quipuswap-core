#include "../partials/IMetadataStorage.ligo"

function main (const p : storage_action; const s : storage) : return is
  case p of
    | Get_metadata(receiver) -> (list [transaction(s, 0tz, receiver)], s) 
    | Update_storage(params) -> ((nil : list (operation)), params)
  end
