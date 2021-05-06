type registry_storage is big_map (key_hash, bool)
type registry_action is
| Validate of key_hash
| Register of key_hash

(* Ensure the key_hash belongs to baker *)
function register (const baker : key_hash; const s : registry_storage) : (list (operation) * registry_storage) is
block {
  s[baker] := True;
  const operations : list (operation) = list [set_delegate(Some(baker))];
} with (operations, s)

(* Validate the received address is in the list of the validates bakers *)
function validate (const baker : key_hash; const s : registry_storage) :  (list (operation) * registry_storage) is
  case s[baker] of
    | Some(v) -> ((nil : list(operation)), s)
    | None -> register(baker, s)
  end;
