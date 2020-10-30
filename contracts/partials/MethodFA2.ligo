(* Helper function to get allowance for an account *)
function get_allowance (const owner_account : account_info; const spender : address; const s : dex_storage) : bool is
  owner_account.allowances contains spender