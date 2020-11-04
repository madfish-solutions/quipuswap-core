(* contract storage *)
type update_owner_type is record [
    owner : address;
    add : bool;
]
type metadata_type is map (string, bytes)

type storage is record [
    metadata : metadata_type;
    owners : set(address);
]

type return is list (operation) * storage

(* Valid entry points *)
type storage_action is 
| Update_owners of update_owner_type
| Update_storage of metadata_type
| Get_metadata of contract (metadata_type)