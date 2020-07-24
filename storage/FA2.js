const { MichelsonMap, UnitValue } = require("@taquito/michelson-encoder");

module.exports = {
  tzip12: {
    tokensLedger: (() => {
      const map = new MichelsonMap();
      map.set(["tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb", 1], 100000);
      map.set(["tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6", 1], 100000);
      map.set(["tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb", 2], 100000);
      map.set(["tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6", 2], 100000);
      return map;
    })(),
    tokenOperators: new MichelsonMap(),
    token_metadata: new MichelsonMap(),
    u: UnitValue,
  },
};