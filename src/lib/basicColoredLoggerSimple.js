const os = require("os")
const chalk = require("chalk")
const errorHelper = require("./errorHelper")

const _HOST = os.hostname()

exports.LogLevel = {
  net: ": NET :",
  debug: ":DEBUG:",
  info: ":INFO :",
  warn: ":WARN :",
  error: ":ERROR:",
  fatal: ":FATAL:",
  alertWarn: ":ALRTW:",
  alertError: ":ALRTE:",
}

//#region init

function mapValues(obj, callback) {
  let newObj = {}
  for (let key in obj) {
    newObj[key] = callback(obj[key])
  }
  return newObj
}

exports.defaultSettings = {
  host: _HOST,
  levelFilter: mapValues(exports.LogLevel, (x) => true),
  colors: {
    net: undefined,
    debug: undefined,
    info: undefined,
    warn: undefined,
    error: undefined,
    fatal: chalk.red,
    alertWarn: undefined,
    alertError: undefined,
  },
  quiet: false, // true = prevent init/shutdown logs
}

exports.AlertLevel = {
  Error: 0,
  Warn: 1,
}

exports.config = {
  host: undefined,
  levelFilter: undefined,
  colors: undefined,
}

exports.init = function(
  {
    host = exports.defaultSettings.host,
    levelFilter,
    colors,
    quiet = exports.defaultSettings.quiet,
  } = exports.defaultSettings
) {
  // settings
  exports.config.host = host
  exports.config.levelFilter = Object.assign(
    // handle no setting & partial setting
    {},
    exports.defaultSettings.levelFilter,
    levelFilter
  )
  exports.config.colors = Object.assign(
    {},
    exports.defaultSettings.colors,
    colors
  ) // handle no setting & partial setting
  exports.config.quiet = quiet

  if (!quiet) {
    // print logger config message
    let isFiltered =
      Object.values(exports.config.levelFilter).indexOf(false) !== -1 // are any levelFilters set to false?
    let hasColors =
      Object.values(exports.config.colors).filter((x) => x).length > 0 // are any colors defined?
    let message = `basicColoredLoggerSimple ${host} isFiltered=${isFiltered}`
    message += ` hasColors=${hasColors}`
    console.log(message)
  }
}

//#endregion

//#region shutdown

exports.shutdown = function() {
  if (!exports.config.quiet) {
    console.log("shutdown basicColoredLoggerSimple")
  }
}

//#endregion

//#region API

exports.net = function(...args) {
  logger(
    exports.LogLevel.net,
    exports.config.levelFilter.net,
    exports.config.colors.net,
    console.log,
    ...args
  )
}

exports.debug = function(...args) {
  logger(
    exports.LogLevel.debug,
    exports.config.levelFilter.debug,
    exports.config.colors.debug,
    console.log,
    ...args
  )
}

exports.info = function(...args) {
  logger(
    exports.LogLevel.info,
    exports.config.levelFilter.info,
    exports.config.colors.info,
    console.log,
    ...args
  )
}

exports.warn = function(...args) {
  logger(
    exports.LogLevel.warn,
    exports.config.levelFilter.warn,
    exports.config.colors.warn,
    console.log,
    ...args
  )
}

exports.error = function(...args) {
  logger(
    exports.LogLevel.error,
    exports.config.levelFilter.error,
    exports.config.colors.error,
    console.log,
    ...args
  )
}

exports.fatal = function(...args) {
  logger(
    exports.LogLevel.fatal,
    exports.config.levelFilter.fatal,
    exports.config.colors.fatal,
    console.log,
    ...args
  )
}

exports.alert = function(alertLevel, ...args) {
  let level =
    alertLevel === exports.AlertLevel.Warn
      ? exports.LogLevel.alertWarn
      : exports.LogLevel.alertError

  let colors =
    alertLevel === exports.AlertLevel.Warn
      ? exports.config.colors.alertWarn
      : exports.config.colors.alertError

  logger(level, exports.config.levelFilter.alert, colors, console.log, ...args)
}

//#endregion

//#region implementation

function logger(level, filter, colors, consolelogger, ...args) {
  if (filter) {
    errorHelper.stringifyErrors(args)
    if (colors) {
      consolelogger(colors(...args))
    } else {
      consolelogger(...args)
    }
  }
}

//#endregion
