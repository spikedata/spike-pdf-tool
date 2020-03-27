const defaultConfig = require("./config/default");
const SpikeConfig = require("./spikeConfig");

async function initGlobals(logSettings, logger, cliLogSettings, cliLogger) {
  // logger
  if (!global.log) {
    logger.implementation.init(logSettings);
    global.log = logger.implementation;
  }
  if (!global.cliLog) {
    cliLogger.implementation.init(cliLogSettings);
    global.cliLog = cliLogger.implementation;
  }
}

async function initDeps() {}

async function initSelf(spikeConfigFile) {
  _config.apiKey = spikeConfigFile.apiKey;
  _config.userKey = spikeConfigFile.userKey;
}

let _initted = false;
let _config;

exports.config = function() {
  return _config;
};

exports.init = async function(
  {
    singletons = defaultConfig.singletons,
    log: logSettings,
    cliLog: cliLogSettings,
    quiet
  } = defaultConfig, // config
  args
) {
  if (_initted) {
    global.log.info("already initialised");
    return true;
  }
  _config = { singletons, logSettings, cliLogSettings, quiet };

  // initGlobals, initDeps, initSelf, fixConfig, shutdown
  try {
    let { logger, cliLogger } = singletons;
    await initGlobals(logSettings, logger, cliLogSettings, cliLogger);
    if (args.subcommand === "configure") {
      return true; // don't SpikeConfig.read() otherwise we will setup the config file twice
    }
    let spikeConfigFile = await SpikeConfig.read();
    await initDeps();
    await initSelf(spikeConfigFile);
    _initted = true;
    return true;
  } catch (err) {
    let logger = global.log ? global.log.fatal : console.error;
    logger("init error", err);
    throw err;
  }
};

exports.shutdown = async function() {
  _initted = false;
  if (!_config.quiet) {
    if (global.log) {
      log.info("spike-pdf-tool shutdown");
    } else {
      console.log("spike-pdf-tool shutdown");
    }
  }
  if (global.log && log.shutdown) {
    log.shutdown();
  }
};
