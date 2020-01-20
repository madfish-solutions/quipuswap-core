type account is record
    balance : nat;
    allowances: map(address, nat);
end

type tokenAction is
| Transfer of (address * address * nat)
| Mint of (nat)
| Burn of (nat)
| Approve of (address * nat)
| GetAllowance of (address * address * contract(nat))
| GetBalance of (address * contract(nat))
| GetTotalSupply of (unit * contract(nat))
