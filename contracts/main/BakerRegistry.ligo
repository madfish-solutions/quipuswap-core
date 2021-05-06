#include "../partials/BakerRegistryMethods.ligo"

(* BakerRegistry - Contract to register the baker *)
function main (const p : registry_action; const s : registry_storage) : (list (operation) * registry_storage) is
  case p of
    | Validate(baker)    -> validate(baker, s)
    | Register(baker)    -> register(baker, s)
  end
