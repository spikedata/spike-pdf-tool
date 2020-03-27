const fs = require("fs")
const ArgumentParser = require("argparse").ArgumentParser

exports.bool = function(s) {
  let v = s.toLowerCase()
  if (["yes", "true", "t", "y", "1"].includes(v)) return true
  else if (["no", "false", "f", "n", "0"].includes(v)) return false
  else throw "invalid bool"
}

/*
NOTES: on dates

By default string dates are assumed to be UTC - unless TZ is supplied:
  > new Date("2019-06-26")
  2019-06-26T00:00:00.000Z
  > new Date("2019-06-26T00:00:00+02:00")
  2019-06-25T22:00:00.000Z

Means that args like `--from 2019-06-26` will create:
- utcToday (2019-06-26T00:00:00.000Z = 2019-06-26T02:00:00.000+02:00)
- not localToday (2019-06-25T22:00:00.000Z = 2019-06-26T00:00:00.000+02:00)
*/

// assumes date is UTC unless TZ is specified
// means that args like `--from 2019-06-26` will create:
// - utcToday (2019-06-26T00:00:00.000Z = 2019-06-26T02:00:00.000+02:00)
// - not localToday (2019-06-25T22:00:00.000Z = 2019-06-26T00:00:00.000+02:00)
// see NOTES: on dates
exports.dateTypeUtc = function(s) {
  let date = new Date(s)
  if (!date) throw "invalid date"
  return date
}

// assumes date is local. TZ should not be specified.
// useful for comparing local dates without conversion to mysql dates
// means that args like `--from 2019-06-26` will create:
// - localToday (2019-06-25T22:00:00.000Z = 2019-06-26T00:00:00.000+02:00)
// - not utcToday (2019-06-26T00:00:00.000Z = 2019-06-26T02:00:00.000+02:00)
// i.e. from sqlDate > 2019-06-26 excluding sqlDates 2019-06-25T22:00 -> 23:59
// see NOTES: on dates
exports.dateTypeLocal = function(s) {
  let date = new Date(s)
  if (!date) throw "invalid date"
  date = dateExt.addTzOffset(date)
  return date
}

exports.filePath = function(s) {
  if (!fs.existsSync(s)) {
    throw "invalid path"
  }
  return s
}

//#region arg parser

/*
e.g. config = {
  argParserDetails: {
    version: "0.0.1",
    addHelp: true,
    description: "Argparse example"
  },
  args: {
    config: {
      type: spikeCommon.args.jsPathType,
      defaultValue: spikeCommon.pathUtil.fixPath("./config/default", false),
      help: "config settings"
    }
  },
  sharedArgs: {
    onEverySubcommand: {
      type: "string",
      defaultValue: undefined,
      help: "can be invoked like this `subcommand --onEverySubcommand x` instead of needing arg before subcommand`--onEverySubcommand x subcommand`"
    }
  },
  subcommands: {
    file: {
      command: {
        addHelp: true,
        description: "Argparse file example"
      },
      args: {
        file: {
          type: "string",
          defaultValue: undefined,
          help: "file to process"
        }
      }
    },
    folder: {
      command: {
        addHelp: true,
        description: "Argparse file example"
      },
      args: {
        folder: {
          type: "string",
          defaultValue: undefined,
          help: "folder to look for files"
        }
      }
    }
  }
}

example command-line:
  node tool.js --config prod file --file x.pdf
  node tool.js --config prod folder --folder /tmp
*/
function buildCommandLineArgParser(config) {
  let parser = new ArgumentParser(config.argParserDetails)

  // root args
  // NOTE: these come before the subcommand name on the commandline e.g. node tool --config prod subcommandX --xArg 1
  if (config.args) {
    for (let a of Object.keys(config.args)) {
      parser.addArgument(["--" + a], config.args[a])
    }
  }

  // subcommand args
  if (config.subcommands) {
    let subparsers = parser.addSubparsers({
      title: "subcommands",
      dest: "subcommand", // this is the argument which you can check in order to tell what subcommand the user specified on the commandline
    })

    for (let sc of Object.keys(config.subcommands)) {
      let subcommandConfig = config.subcommands[sc]
      let sub = subparsers.addParser(sc, subcommandConfig.command)
      let a
      for (a of Object.keys(subcommandConfig.args)) {
        sub.addArgument(["--" + a], subcommandConfig.args[a])
      }
      if (config.sharedArgs) {
        for (a of Object.keys(config.sharedArgs)) {
          sub.addArgument(["--" + a], config.sharedArgs[a])
        }
      }
    }
  }
  return parser
}

exports.setCommandLineArgs = function(config) {
  let parser = buildCommandLineArgParser(config)
  let args = parser.parseArgs()
  return args
}

//#endregion
