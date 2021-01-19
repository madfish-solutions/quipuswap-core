(* contract storage *)
type update_owner_type is record [
    add : bool; (* whether add or remove account from owners *)
    owner : address; (* account *)
]
type metadata_type is big_map (string, bytes)

type storage is record [
    metadata : metadata_type; (* metadata accoding to TZIP-16 *)
    owners : set(address); (* all owners *)
]

type return is list (operation) * storage

(* Valid entry points *)
type storage_action is 
| Update_owners     of update_owner_type (* manage owner permissions *)
| Update_storage    of metadata_type (* update storage *)
| Get_metadata      of contract (metadata_type) (* send the storage data to the account *)