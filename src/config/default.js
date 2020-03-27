const chalk = require("chalk");
const Config = require("../lib/config");
const basicColoredLogger = require("../lib/basicColoredLogger");
const basicColoredLoggerSimple = require("../lib/basicColoredLoggerSimple");

const AppLogName = "pdf-tool";

module.exports = Config.define(undefined, {
  singletons: {
    logger: {
      interface: basicColoredLogger,
      implementation: basicColoredLogger,
      implementationName: "basicColoredLogger"
    },
    cliLogger: {
      interface: basicColoredLoggerSimple,
      implementation: basicColoredLoggerSimple,
      implementationName: "basicColoredLoggerSimple"
    }
  },

  log: {
    host: AppLogName,
    /* */
    levelFilter: {
      net: true,
      debug: true,
      info: true,
      warn: true,
      error: true,
      fatal: true,
      alertWarn: true,
      alertError: true,
      scrape: true,
      screen: true,
      step: true
    },
    /* */
    colors: {
      net: chalk.gray,
      debug: chalk.gray,
      info: chalk.gray,
      warn: chalk.gray,
      error: chalk.gray,
      fatal: chalk.red,
      alertWarn: chalk.red,
      alertError: chalk.red,
      scrape: chalk.gray,
      screen: chalk.gray,
      step: chalk.gray
    },
    quiet: true
  },

  cliLog: {
    host: AppLogName,
    /* */
    levelFilter: {
      net: true,
      debug: true,
      info: true,
      warn: true,
      error: true,
      fatal: true,
      alertWarn: true,
      alertError: true,
      scrape: true,
      screen: true,
      step: true
    },
    /* */
    colors: {
      net: chalk.green,
      debug: chalk.gray,
      info: chalk.white,
      warn: chalk.orange,
      error: chalk.red,
      fatal: chalk.red,
      alertWarn: chalk.red,
      alertError: chalk.red,
      scrape: chalk.cyan,
      screen: chalk.magenta,
      step: chalk.magenta
    },
    quiet: true
  },

  quiet: true
});
