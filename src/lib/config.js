const Interface = require("./interface")
const objectUtil = require("./object")

/*
Motivation:

- Singletons were being cloned in the old config object which used spikeCommon.object.mergeObjectsClone
- This meant the `const singleton = require(singleton)` would point to a different object to that supplied in the config object { singletonImpl: { .. } }
- Hence singleton.state.isInitialized would be false, whilst singletonImpl.state.isInitialized was true, causing 2 libs which depended on the singleton to fail

Example:

- Both .logger & .appLocalDirImpl below were being duplicated
- Hence config.appLocalDirImpl.initialized was different to appLocalDirExt.js : exports.initialized
- spike-api/Banksy/test/config/unittest.js
  ```
  module.exports = {
    logger: require("../../../../spike-global/src/unittestBanksyLogger"),
    log: {
      // ...
    },

    appLocalDirImpl: require("../../src/lib/appLocalDirExt"),
    appLocalDir: {
      root: ilanWebConfig.appLocalDir.root,
      uploadToS3: false,
      s3bucket: false,
      dumpOnErrorOrException: false
    },
  }
  ```
- spike-api/Banksy/test/config/unittest-s3test.js
  ```
  const parent = require("./unittest");
  module.exports = spikeCommon.object.mergeObjectsClone(parent, {
    appLocalDir: {
      uploadToS3: true,
      s3bucket: `banksy-test`,
      dumpOnErrorOrException: true
    }
  });
  ```
*/

module.exports = {
  define(base, overrides) {
    /*
      see: spike-common/test/config.js
      shape:
        {
          singletons: {
            appLocalDir: {
              interface: appLocalDir,
              implementation: appLocalDirExt,
              implementationName: "appLocalDirExt",
            }
          }
        }
    */

    if (!base) {
      return overrides
    }

    // 1. check .singletons
    if (overrides.singletons) {
      let singletons = Object.keys(overrides.singletons)
      for (let singletonName of singletons) {
        let s = overrides.singletons[singletonName]
        let singletonInterface =
          s.interface || base.singletons[singletonName].interface

        // 1.1 overrides.singletons - each implementation must implement the interface fully
        Interface.check(
          singletonName,
          singletonInterface,
          s.implementationName,
          s.implementation
        )
      }
    }

    // 2. create config
    // 2.1 remove .singletons
    let overridesSingletons
    if (overrides.singletons) {
      overridesSingletons = overrides.singletons
      delete overrides.singletons
    } else {
      overridesSingletons = {}
    }

    // 2.2 merge all config data
    overrides = objectUtil.mergeObjectsClone(base, overrides)

    // 2.3 keep any override singletons but add missing singletons from base
    if (base.singletons) {
      objectUtil.addMissingMutate(overridesSingletons, base.singletons)
    }
    overrides.singletons = overridesSingletons

    // 3. return config
    return overrides
  },
}
