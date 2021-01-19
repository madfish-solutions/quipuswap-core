import { Metadata } from "./helpers/metadataStorage";
import { strictEqual, ok, notStrictEqual, rejects } from "assert";
import BigNumber from "bignumber.js";
import accounts from "./accounts/accounts";
import { prepareProviderOptions } from "./helpers/utils";
import { MichelsonMap } from "@taquito/michelson-encoder";

const CMetadataStorage = artifacts.require("MetadataStorage");

contract("MetadataStorage()", function () {
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

  function updateMetadataSuccessCase(decription, sender, metadata) {
    it(decription, async function () {
      let config = await prepareProviderOptions(sender);
      tezos.setProvider(config);
      await metadataStorage.updateMetadata(metadata);
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

  describe("Test update metadata permission", () => {
    matadataFailCase(
      "revert in case of updating by an unprivileged user",
      "carol",
      async () =>
        metadataStorage.updateMetadata(
          MichelsonMap.fromLiteral({
            some: Buffer.from("new", "ascii").toString("hex"),
          })
        ),
      "MetadataStorage/permision-denied"
    );
    updateMetadataSuccessCase(
      "success in case of updating metadata by one of the owners",
      "alice",
      MichelsonMap.fromLiteral({
        some: Buffer.from("new", "ascii").toString("hex"),
      })
    );
  });

  describe("Test owner status update", () => {
    updateOwnerSuccessCase(
      "success in case of adding existed owner",
      "alice",
      bobAddress,
      true
    );
    updateOwnerSuccessCase(
      "success in case of removing unexisted owner",
      "alice",
      carolAddress,
      false
    );
    updateOwnerSuccessCase(
      "success in case of adding unexisted owner",
      "alice",
      carolAddress,
      true
    );
    updateOwnerSuccessCase(
      "success in case of removing existed owner",
      "alice",
      carolAddress,
      false
    );
  });
});
