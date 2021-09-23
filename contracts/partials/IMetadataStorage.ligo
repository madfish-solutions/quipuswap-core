(* contract storage_type *)
type set_owner_type     is record [
  add                     : bool; (* whe/ther add or remove account from owners *)
  owner                   : address; (* account *)
]
type metadata_type      is big_map (string, bytes)

type storage_type       is record [
  metadata                : metadata_type; (* metadata accoding to TZIP-16 *)
  owners                  : set(address); (* all owners *)
]

type return_type        is list (operation) * storage_type

(* Valid entry points *)
type action_type        is
| Update_owners           of set_owner_type (* manage owner permissions *)
| Update_storage          of metadata_type (* update storage_type *)
| Get_metadata            of contract (metadata_type) (* send the storage_type data to the account *)
