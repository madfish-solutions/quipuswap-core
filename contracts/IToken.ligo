type amount is nat;

type account is record
    balance : amount;
    allowances: map(address, amount);
end

type tokenAction is
| Transfer of (address * address * amount)
| Mint of (amount)
| Burn of (amount)
| Approve of (address * amount)
| GetAllowance of (address * address * contract(amount))
| GetBalance of (address * contract(amount))
| GetTotalSupply of (unit * contract(amount))
