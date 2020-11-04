(* contract storage *)
type storage is map (string, bytes)

type return is list (operation) * storage

(* Valid entry points *)
type storage_action is 
| Get_metadata of contract (storage)
| Update_storage of storage