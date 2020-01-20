type action is
| Receive of nat
| Request of (address * address * address)

function main(const param: nat; const store: address): (list(operation) * address)
    is block {
        const contr: contract(action) = get_contract(store);
        const params: action = Receive(param) ;
        const op: operation = transaction(params, 0tz, contr);
        const opList: list(operation) = list op; end;
    } with (opList, store)
