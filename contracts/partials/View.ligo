type token_id is nat

type token_metadata_info is
  [@layout:comb]
  record [
    token_id  : token_id;
    token_info    : map (string, bytes);
  ]

type func_type is nat -> token_metadata_info
type storage is big_map(nat, func_type)

function get_metadata (const token_id : nat) : token_metadata_info is
  record [
    token_id    = 0n;
    token_info  = map[
      "symbol" -> 0x515054;
      "name" -> 0x5175697075204c5020546f6b656e;
      "decimals" -> 0x36;
      "shouldPreferSymbol" -> 0x74727565;
      "description" -> 0x51756970757377617020536861726520506f6f6c20546f6b656e;
      // "thumbnailUri" -> 0x00;
    ]
  ]

function main (const f : func_type ; const s : storage) :
  (list(operation) * storage) is
  block { 
      s[0n] := f;
   } with ((nil : list(operation)), s)
