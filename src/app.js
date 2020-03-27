const fs = require("fs");
const path = require("path");
const Async = require("async");
const minimatch = require("minimatch");
const Duration = require("duration");
let spikeApi = require("@spikedata/api");
const appInit = require("./init");
const SpikeConfig = require("./spikeConfig");
const Args = require("./lib/args");
const Csv = require("./lib/csv");
const pdfHelpers = require("./lib/pdfHelpers");
const userInput = require("./lib/userInput");
const Config = require("./config/index");
const { version } = require("../package.json");

// HACK: for webpack'ed ./dist/pdf/app.js
// - when require()d in src app (./sample-simple/src/pdf/app.js) uses `main` = `@spikedata/api/src/main.js`
// - when require()d in webpacked app (./sample-simple/dist/pdf/app.js) uses `module` = @spikedata/api/dist/spike-api.esm.mjs`
// - see `npm run build`
if (spikeApi.default) {
  spikeApi = spikeApi.default;
}

//#region cli

const allConfigs = Object.keys(Config).filter(x => x !== "checkConfig");
const filterTypes = {
  all: {
    option: 1,
    text: "all"
  },
  "new-only": {
    option: 2,
    text: "new files only"
  },
  "new-and-prev-errors": {
    option: 3,
    text: "new + prev errors"
  },
  pattern: {
    option: 4,
    text: "filename matching a pattern"
  },
  none: {
    option: 5,
    text: "none = quit"
  }
};
const allFilterTypes = Object.keys(filterTypes);
const optionTofilterType = Object.keys(filterTypes).reduce((prev, cur) => {
  prev[filterTypes[cur].option] = cur;
  return prev;
}, {});
// console.log(JSON.stringify(optionTofilterType, null, 2))
const filterTypesMenu = Object.keys(filterTypes).reduce((prev, cur) => {
  let filterType = filterTypes[cur];
  return `${prev}\n${filterType.option}. ${filterType.text}`;
}, "");
// console.log(filterTypesMenu)

//#region args

function bool(s) {
  let v = s.toLowerCase();
  if (["yes", "true", "t", "y", "1"].includes(v)) return true;
  else if (["no", "false", "f", "n", "0"].includes(v)) return false;
  else throw "invalid bool";
}

function rawPathType(s) {
  if (!fs.existsSync(s)) throw new Error("invalid path");
  return s;
}

// s
//  - start and end with /
//  - can have regexp flags after ending / e.g. "/\.pdf/i"
//  - no need to escape strings in shell e.g.
//    - THIS --re "/\d\s\d{3}/"
//    - NOT  --re "/\\d\\s\\d{3}/"
function regex(s) {
  if (typeof s != "string" && s[0] != "/") {
    throw "invalid regex string";
  }

  let lastSlash = s.lastIndexOf("/");
  if (lastSlash == 0) {
    throw "invalid regex string";
  }

  let flags = undefined;
  if (lastSlash < s.length - 1) {
    flags = s.substr(lastSlash + 1, s.length - lastSlash - 1);
  }
  let t = s.substr(1, lastSlash - 1);
  // t = escapeRegExp(t);

  try {
    return new RegExp(t, flags);
  } catch (e) {
    throw "invalid regex parse";
  }
}

//#endregion

const _CommandLineArgs = {
  argParserDetails: {
    version,
    addHelp: true,
    description: "Argparse example"
  },
  sharedArgs: {
    config: {
      choices: allConfigs,
      defaultValue: "default",
      help: "config settings"
    },
    quiet: {
      action: "storeTrue",
      defaultValue: false,
      help: "don't print library logs"
    }
  },
  subcommands: {
    configure: {
      command: {
        addHelp: true,
        description: "Configure the tool with your keys"
      },
      args: {}
    },
    folder: {
      command: {
        addHelp: true,
        description: "Recurse through a folder and process all .pdfs found"
      },
      args: {
        writeOutputCsv: {
          type: bool,
          defaultValue: true,
          help: "write .csv = just transactions from .pdf"
        },
        writeOutputJson: {
          type: bool,
          defaultValue: true,
          help: "write .json = full result extracted from .pdf"
        },
        writeOutput: {
          type: bool,
          help: "shortcut to set --writeOutput*=true|false"
        },
        writeIndex: {
          type: bool,
          defaultValue: true,
          help:
            "write results to index.csv file - useful to switch it off if changing identify() functions"
        },
        index: {
          type: rawPathType,
          help: "path to summary index file"
        },
        folder: {
          type: "string",
          required: true,
          help: "folder with PDF files"
        },
        stripFolder: {
          action: "storeTrue",
          defaultValue: true,
          help: "remove folder from path in outputs"
        },
        filterPath: {
          type: regex,
          help: "regex to match against paths of files found in folder"
        },
        max: {
          type: "int",
          defaultValue: -1,
          help: "End after max files - ignored if max <= 0"
        },
        listFilesOnly: {
          action: "storeTrue",
          defaultValue: false,
          help: "just list files found which match filters"
        },
        concurrent: {
          type: "int",
          defaultValue: 1,
          help: "Number of concurrent requests to execute in parallel"
        },
        filterType: {
          choices: allFilterTypes,
          defaultValue: undefined,
          help: "Specify filtering on commandline, rather than by manual input"
        }
      }
    }
  }
};

function setIndexPath(args) {
  if (!args.index) {
    args.index = path.join(args.folder, "folder.csv");
  }
}

function fixArgs(args) {
  switch (args.subcommand) {
    case "configure": {
      break;
    }
    case "folder": {
      setIndexPath(args);
      if (args.writeOutput !== null) {
        args.writeOutputCsv = args.writeOutput;
        args.writeOutputJson = args.writeOutput;
      }
      break;
    }
  }
}

function fixArgsAndConfig(args, config) {
  // quiet
  if (args.quiet) {
    // just quieten the library logger, not cliLogger
    config.log.levelFilter = {
      net: false,
      debug: false,
      info: false,
      warn: false,
      error: false,
      fatal: false,
      alertWarn: false,
      alertError: false,
      scrape: false,
      screen: false,
      step: false
    };
    config.cliLog.levelFilter = {
      debug: false
    };
  }
}

async function run() {
  let args;
  try {
    args = Args.setCommandLineArgs(_CommandLineArgs);
    fixArgs(args);
    // console.dir(args);

    if (!Config.checkConfig(args.config)) {
      return;
    }
    let config = Config[args.config];
    fixArgsAndConfig(args, config);
    AppConfig = config;
    await appInit.init(config, args);

    // implement
    await implementation(args);
  } catch (ex) {
    let logger = global.cliLog ? global.cliLog.fatal : console.error;
    logger("top-level exception", ex);
  } finally {
    await appInit.shutdown();
  }
}

//#endregion

//#region top-level functions

async function implementation(args) {
  try {
    switch (args.subcommand) {
      case "configure": {
        await configure();
        break;
      }
      case "folder": {
        await folder(args);
        break;
      }
    }
  } catch (ex) {
    // this gets thrown by "read" which is used by userInput.question()
    if (ex.message === "canceled") {
      console.error("\nuser input cancelled, exiting.");
      process.exit(-1);
    }

    cliLog.fatal("exception", ex);
  }
}

async function configure() {
  await SpikeConfig.write();
}

function arrayToObject(array, key, deleteKey = false) {
  return array.reduce((obj, item) => {
    obj[item[key]] = item;
    if (deleteKey) {
      delete item[key];
    }
    return obj;
  }, {});
}

async function folder(args) {
  // read prevIndex
  let prevIndex;
  if (fs.existsSync(args.index)) {
    let csv = Csv.readCsv(args.index);
    prevIndex = arrayToObject(csv, "file");
  }

  let found = await findPdfs(args, prevIndex);
  // console.log(JSON.stringify(found, null, 2))

  // early out if  --listFilesOnly
  if (args.listFilesOnly) {
    return;
  }

  let filtered = await filterPdfs(args, found);
  if (!filtered || filtered.length === 0) {
    cliLog.info("No files to process, exiting ...");
    process.exit(0);
  }
  // console.log(JSON.stringify(filtered, null, 2))
  // return // HACK

  let { start, end, results } = await processAll(args, filtered);

  // index
  if (args.writeIndex) {
    writeIndex(args, results, prevIndex);
  }

  // summary
  writeSummary(found.length, results, start, end);
}

//#endregion

async function findPdfs(args, prevIndex) {
  let filePaths = await pdfHelpers.find(args.folder, args.filterPath);
  cliLog.net("--------------------------------");
  cliLog.net("Pdfs found:");
  cliLog.net("--------------------------------");
  if (args.max > 0) {
    filePaths = filePaths.slice(0, args.max);
  }

  let { categorized, counts } = categorize(args, filePaths, prevIndex);

  // print with state = new, prev-error, prev-success
  for (let x of categorized) {
    let logger;
    switch (x.state) {
      case Category.new:
        logger = cliLog.net;
        break;
      case Category.prevError:
        logger = cliLog.warn;
        break;
      case Category.prevSuccess:
        logger = cliLog.info;
        break;
    }
    logger(` ${x.short} (${x.state})`);
  }

  cliLog.info("---");
  cliLog.info(`new: ${counts.new}`);
  cliLog.info(`prev-success: ${counts.prevSuccess}`);
  cliLog.info(`prev-error: ${counts.prevError}`);

  return categorized;
}

const Category = {
  new: "new",
  prevSuccess: "prev-success",
  prevError: "prev-error"
};

function categorize(args, filePaths, prevIndex) {
  let counts = {
    new: 0,
    prevSuccess: 0,
    prevError: 0
  };
  let categorized = filePaths.map(filePath => {
    // print with state = new, prev-error, prev-success
    let short = shorten(filePath, args.folder);
    let prev = prevIndex && prevIndex[short];
    let state;
    if (prev) {
      if (prev.type == spikeApi.enums.TYPES.SUCCESS) {
        state = "prev-success";
        counts.prevSuccess++;
      } else {
        state = "prev-error";
        counts.prevError++;
      }
    } else {
      state = "new";
      counts.new++;
    }
    return { filePath, short, prev, state }; // found
  });

  return { categorized, counts };
}

async function filterPdfs(args, found) {
  let filterType;
  if (args.filterType) {
    // filterType was specified on the commandline
    filterType = args.filterType;
  } else {
    // let user pick the filter type
    cliLog.net();
    cliLog.net("--------------------------------");
    cliLog.net("Which pdfs do you want to process:");
    cliLog.net("--------------------------------");
    cliLog.info(filterTypesMenu);
    while (true) {
      let option = await userInput.question("Enter option: ", false, undefined, undefined);
      option = +option;
      if (1 <= option && option <= 5) {
        filterType = optionTofilterType[option];
        break;
      } else {
        cliLog.fatal("Invalid, please try again");
      }
    }
  }

  let filtered;
  switch (filterType) {
    case "all": {
      filtered = found;
      break;
    }
    case "new-only": {
      filtered = found.filter(x => x.state === Category.new);
      break;
    }
    case "new-and-prev-errors": {
      filtered = found.filter(x => x.state === Category.new || x.state === Category.prevError);
      break;
    }
    case "pattern": {
      filtered = await wildcardMatch(args, found);
      break;
    }
    case "none": {
      process.exit(0);
    }
  }
  return filtered;
}

async function wildcardMatch(args, found) {
  cliLog.net("--------------------------------");
  while (true) {
    let pattern = await userInput.question("Enter pattern: ", false, undefined, undefined);
    let matches = found.filter(x => minimatch(x.filePath, pattern));
    cliLog.info("Matches:\n " + matches.map(x => x.short).join("\n "));

    let cont = await userInput.question("Process these files? (Y/n): ", false, undefined, "y");
    if (cont == "y" || cont == "Y") {
      return matches;
    }
  }
}

//#region processAll

async function processAll(args, filtered) {
  cliLog.net();
  cliLog.net("--------------------------------");
  cliLog.net("Processing:");
  cliLog.net("--------------------------------");

  let i = 0;
  let results = [];
  let start = new Date();

  // create queue to process tasks concurrently
  let q = Async.queue(async function(task) {
    let { i, filePath, args, prev } = task;
    // console.log(`start ${i}. ${filePath}`);
    let summary = await doProcess(filePath, args, prev);
    results.push(summary);
    // console.log(`end ${i}. ${filePath}`);
  }, args.concurrent);

  // add files to task queue
  for (let filt of filtered) {
    ++i;
    if (args.max > 0 && i > args.max) {
      cliLog.warn("max reached");
      break;
    }

    let task = {
      i,
      filePath: filt.filePath,
      args,
      prev: filt.prev
    };
    q.push(task, function(err) {
      if (err) {
        console.error("task error", i, err);
      } else {
        // console.log("task done", i);
      }
    });
  }

  // await all file requests
  await q.drain();

  let end = new Date();
  return { start, end, results };
}

//#endregion

//#region writeIndex

function writeIndex(args, results, prevIndex) {
  // combine current results with existing results from index
  if (prevIndex) {
    results.forEach(x => (prevIndex[x.file] = x));
    results = Object.values(prevIndex);
  }

  Csv.writeCsv(args.index, results, undefined, false, true, "file");
  cliLog.info("\nWrote: " + args.index);
}

//#endregion

//#region writeSummary

function writeSummary(numFound, results, start, end) {
  let numProcessed = results.length;
  cliLog.net();
  cliLog.net("--------------------------------");
  cliLog.net("Summary:");
  cliLog.net("--------------------------------");
  cliLog.info(`Total found: ${numFound}`);
  cliLog.info(`Total processed: ${numProcessed}`);
  cliLog.info(`Time taken: ${new Duration(start, end).toString()}`);

  // API success/fails
  cliLog.info(`Processing results:`);
  let count;
  // successes
  count = results.filter(x => x.type == spikeApi.enums.TYPES.SUCCESS).length;
  cliLog.info(`- successes: ${count} / ${numProcessed}`);
  // fails
  count = results.filter(x => x.type == spikeApi.enums.TYPES.ERROR).length;
  if (count > 0) {
    cliLog.error(`- fails: ${count} / ${numProcessed}`);
  }

  // Tool exceptions
  count = results.filter(x => x.summaryException).length;
  if (count > 0) {
    cliLog.error(`Tool errors: ${count}`);
  }
}

//#endregion

//#region process

async function doProcess(filePath, args, prev) {
  // report filename (header before any library logs for this file)
  let shortFilePath = shorten(filePath, args.folder);
  cliLog.info(`Processing ${shortFilePath} ...`);

  // settings
  let fileSettings = pdfHelpers.findPdfSettings(filePath, args.folder);
  if (!args.quiet && !args.password && fileSettings.pass) {
    cliLog.debug("using password from settings.json");
  }
  let password = args.password || fileSettings.pass; // if set but not required then will be ignored

  // process
  if (fileSettings.skip) {
    if (!args.quiet) {
      cliLog.info("skipped");
    }
    return createSummarySkipped(args.folder, filePath, password);
  }

  let result = await processPdf({
    folder: args.folder,
    filePath,
    shortFilePath,
    password,
    writeOutputJson: args.writeOutputJson,
    writeOutputCsv: args.writeOutputCsv,
    quiet: args.quiet
  });

  return result;
}

//#endregion

function shorten(filePath, folder) {
  // make sure we have full paths
  folder = path.resolve(folder);
  filePath = path.resolve(filePath);

  if (filePath.startsWith(folder)) {
    let l = folder.endsWith("/") || folder.endsWith("\\") ? folder.length : folder.length + 1;
    filePath = filePath.substr(l);
    return filePath;
  }
  return filePath;
}

async function requestPdf(apikey, userkey, pdfPath, pass) {
  try {
    return await spikeApi.pdf(apikey, userkey, pdfPath, pass);
  } catch (e) {
    if (e instanceof spikeApi.PdfTooLargeError) {
      console.error(`EXCEPTION: the pdf is too large:`, pdfPath);
    } else if (e instanceof spikeApi.InputValidationError) {
      console.error("EXCEPTION: invalid inputs:", pdfPath, "\n ", e.validationErrors.join("\n "));
    } else {
      if (!e.response) {
        // net connection error (e.g. down, timeout) or > axios maxBodyLength limit
        // e : AxiosResponse
        console.error("EXCEPTION: net connection error:", pdfPath + ":", e.code || e.message);
      } else {
        // http status error (e.g. 500 internal server error, 413 too big)
        // e : AxiosResponse
        console.error(
          "EXCEPTION: http status error:",
          pdfPath + ":",
          e.response.status,
          e.response.statusText
        );
      }
    }
    return undefined;
  }
}

async function processPdf({
  folder,
  filePath,
  shortFilePath,
  password,
  writeOutputJson,
  writeOutputCsv,
  quiet
}) {
  let requestTime = new Date();
  let { apiKey, userKey } = appInit.config();
  let result = await requestPdf(apiKey, userKey, filePath, password);
  let responseTime = new Date();
  // console.log("JSON", JSON.stringify(response, null, 2));

  // report success | fail
  if (!quiet) {
    if (result === undefined) {
      cliLog.error(`${shortFilePath}: error: no response`);
    } else if (result.type === spikeApi.enums.TYPES.ERROR) {
      cliLog.error(`${shortFilePath}: error:`, result.code);
    } else {
      cliLog.net(`${shortFilePath}: success`);
      // cliLog.info(`${shortFilePath}: SUCCESS:`, result.data.parser, result.code)
    }
  }

  if (result) {
    if (writeOutputJson) {
      pdfHelpers.writeOutputJson(filePath, result);
    }
    if (writeOutputCsv && result.type == spikeApi.enums.TYPES.SUCCESS) {
      pdfHelpers.writeOutputCsv(filePath, result.data);
    }
  }

  // summary for index
  let summary = {};
  try {
    // NOTE: keep in sync with $/spike-db/src/pdfResult.js
    let dataSummary = {};
    if (result && result.type == spikeApi.enums.TYPES.SUCCESS) {
      dataSummary = pdfHelpers.getPdfResultSummary(result.data);
    }
    summary.file = folder ? shorten(filePath, folder) : path.basename(filePath);
    summary.requestTime = requestTime;
    summary.responseTime = responseTime;
    summary.duration = new Duration(requestTime, responseTime).toString();
    summary.requestId = result && result.requestId;
    summary.type = result ? result.type : spikeApi.enums.TYPES.ERROR;
    summary.code = result ? result.code : "no result";
    summary.parser = dataSummary.parser;
    summary.numTransactions = dataSummary.numTransactions;
    summary.numBreaks = dataSummary.numBreaks;
    summary.accountNumber = dataSummary.accountNumber;
    summary.issuedOn = dataSummary.issuedOn;
    summary.from = dataSummary.from;
    summary.to = dataSummary.to;
    summary.nameAddress = dataSummary.nameAddress;
    summary.detected = dataSummary.detected;
    summary.flags = dataSummary.flags;
  } catch (ex) {
    log.fatal(`${filePath}: exception whilst creating summary:`, ex);
    cliLog.fatal(`${filePath}: exception whilst creating summary`);
    summary.summaryException = true;
  }
  return summary;
}

function createSummarySkipped(folder, filePath, password) {
  return {
    type: spikeApi.enums.TYPES.NOTSET,
    code: "skipped",
    file: folder ? shorten(filePath, folder) : path.basename(filePath),
    password
  };
}

run();
