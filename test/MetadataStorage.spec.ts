import { Metadata } from "./helpers/metadataStorage";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { prepareProviderOptions } from "./helpers/utils";
const CMetadataStorage = artifacts.require("MetadataStorage");

contract.only("MetadataStorage()", function () {
  let metadataStorage: Metadata;
  const aliceAddress: string = accounts.alice.pkh;
  const bobAddress: string = accounts.bob.pkh;
  const carolAddress: string = accounts.carol.pkh;

  before(async () => {
    metadataStorage = await Metadata.init(
      (await CMetadataStorage.deployed()).address
    );
  });

  function updateOwnerSuccessCase(decription, sender, owner, add) {
    it(decription, async function () {
      let config = await prepareProviderOptions(sender);
      tezos.setProvider(config);
      await metadataStorage.updateStorage({});
      const initOwners = metadataStorage.storage.owners;

      await metadataStorage.updateOwners(add, owner);
      await metadataStorage.updateStorage({});
      const updatedOwners = metadataStorage.storage.owners;
      strictEqual(updatedOwners.includes(owner), add);
    });
  }

  function matadataFailCase(decription, sender, act, errorMsg) {
    it(decription, async function () {
      let config = await prepareProviderOptions(sender);
      tezos.setProvider(config);
      await rejects(act(), (err) => {
        ok(err.message == errorMsg, "Error message mismatch");
        return true;
      });
    });
  }

  describe("Test update user's status permission", () => {
    matadataFailCase(
      "revert in case of updating by an unprivileged user",
      "bob",
      async () => metadataStorage.updateOwners(true, bobAddress),
      "MetadataStorage/permision-denied"
    );
    updateOwnerSuccessCase(
      "success in case of updating owner by one of the owners",
      "alice",
      bobAddress,
      true
    );
  });
});
