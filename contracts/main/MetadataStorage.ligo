#include "../partials/IMetadataStorage.ligo"

(* Add or remove the admin permissions for address; only called by one of the current owners *)
function update_owner (const params : update_owner_type; const s : storage) : return is 
  block {
    if s.owners contains Tezos.sender then
      skip
    else failwith("MetadataStorage/permision-denied");
    if params.add then
      s.owners := Set.add (params.owner, s.owners)
    else
      s.owners := Set.remove (params.owner, s.owners);
  } with ((nil : list (operation)), s)

(* Update the metadata for the token; only called by one of the current owners *)
function update_metadata (const new_metadata : metadata_type; const s : storage) : return is 
  block {
    if s.owners contains Tezos.sender then
      skip
    else failwith("MetadataStorage/permision-denied");
    s.metadata := new_metadata;
  } with ((nil : list (operation)), s)

(* MetadataStorage - Contract to store and upgrade the shares token metadata *)
function main (const p : storage_action; const s : storage) : return is
  case p of
    | Update_owners(params)         -> update_owner(params, s)
    | Update_storage(new_metadata)  -> update_metadata(new_metadata, s)
    | Get_metadata(receiver)        -> (list [transaction(s.metadata, 0tz, receiver)], s) 
  end
