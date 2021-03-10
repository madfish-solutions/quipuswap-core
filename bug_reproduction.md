# Bug Reproduction

0. Install dependencies

```
yarn
```

1. Start sandbox:

```
yarn start-sandbox
```

2. Run migration scripts:

```
yarn migrate --network testbug
```

It fails with `proto.008-PtEdo2Zk.context.storage_error`.

Look at `./migrations/2_deploy_dex.js` to see the steps done during the migration.
