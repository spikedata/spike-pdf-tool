const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");
const Csv = require("./csv");

//#region spike-pdf/tools/lib/finder

exports.find = async function(
  dataDir,
  re = undefined,
  extension = ".pdf",
  extensionCaseInsensitive = true
) {
  if (extensionCaseInsensitive) {
    extension = extension.toLowerCase();
  }
  let filePaths = await exports.getFilesRecursive(
    dataDir,
    fullPath => (extensionCaseInsensitive ? fullPath.toLowerCase() : fullPath).endsWith(extension),
    -1,
    exports.FsType.File
  );
  // console.log("filePaths", filePaths.length);
  if (re) {
    return filePaths.filter(x => re.test(x));
  }
  return filePaths;
};

exports.findPdfSettings = function(filePath, folder) {
  let settings = {};

  if (folder) {
    // make sure we have full paths
    folder = path.resolve(folder);
    filePath = path.resolve(filePath);

    let folders = filePath
      .split(`${folder}${path.sep}`)
      .pop()
      .split(path.sep);

    let settingsFolders = [folder];
    for (let i = 0; i < folders.length - 1; i++) {
      settingsFolders.push(path.join(settingsFolders[settingsFolders.length - 1], folders[i]));
    }

    for (let settingsFolder of settingsFolders) {
      let settingsPath = path.join(settingsFolder, "settings.json");
      if (fs.existsSync(settingsPath)) {
        let settingsValues = JSON5.parse(fs.readFileSync(settingsPath, "utf8"));
        settings = Object.assign(settings, settingsValues);
      }
    }
  } else {
    // path/settings.json
    folder = path.dirname(filePath);
    let allSettings = path.join(folder, "settings.json");
    if (fs.existsSync(allSettings)) {
      let settingsValues = JSON5.parse(fs.readFileSync(allSettings, "utf8"));
      settings = Object.assign(settings, settingsValues);
    }
  }

  // path/file.pdf.settings.json
  let fileSettings = `${filePath}.settings.json`;
  if (fs.existsSync(fileSettings)) {
    let settingsValues = JSON5.parse(fs.readFileSync(fileSettings, "utf8"));
    settings = Object.assign(settings, settingsValues);
  } else {
    // path/file.settings.json
    fileSettings = path_replace_ext(filePath, ".settings.json");
    if (fs.existsSync(fileSettings)) {
      let settingsValues = JSON5.parse(fs.readFileSync(fileSettings, "utf8"));
      settings = Object.assign(settings, settingsValues);
    }
  }

  return settings;
};

function path_replace_ext(p, newExt) {
  return path_strip_ext(p) + newExt;
}

function path_strip_ext(p) {
  let l = path.extname(p).length;
  return l ? p.slice(0, -l) : p;
}

exports.FsType = {
  File: 1,
  Directory: 2,
  Both: 3
};

exports.getFilesRecursive = function(
  dir,
  filterCB = fullPath => true,
  maxDepth = -1,
  type = exports.FsType.Both,
  currentDepth = 0
) {
  let results = [];
  let list = fs.readdirSync(dir);
  list.forEach(function(file) {
    let fullPath = path.resolve(path.join(dir, file));
    let stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (type & exports.FsType.Directory) {
        if (filterCB(fullPath)) {
          results.push(fullPath);
        }
      }
      if (maxDepth === -1 || currentDepth + 1 <= maxDepth) {
        results = results.concat(
          exports.getFilesRecursive(fullPath, filterCB, maxDepth, type, currentDepth + 1)
        );
      }
    } else {
      if (type & exports.FsType.File) {
        if (filterCB(fullPath)) {
          results.push(fullPath);
        }
      }
    }
  });
  return results;
};

//#endregion

//#region spike-pdf/src/lib/common

exports.path_replace_ext = function(p, newExt) {
  return exports.path_strip_ext(p) + newExt;
};

exports.path_strip_ext = function(p) {
  let l = path.extname(p).length;
  return l ? p.slice(0, -l) : p;
};

exports.writeOutputJson = function(filename, data) {
  // write .json
  let p = exports.path_replace_ext(filename, ".json");
  let buffer = JSON.stringify(data, null, 2);
  fs.writeFileSync(p, buffer);
  log.info("Wrote:", p);
  return buffer;
};

exports.writeOutputCsv = function(filePath, data) {
  // NOTE: this handles different shapes - like credit-card-multiuser etc...
  let p = exports.path_replace_ext(filePath, ".csv");
  return exports.writeTransactionsToCsv(p, data);
};

exports.writeTransactionsToCsv = function(
  csvPath,
  data,
  extraColFile = false,
  extraColParser = false
) {
  let { cols, transactions } = getTransactionsForCsv(data, extraColFile, extraColParser);
  // log.info(JSON.stringify(transactions));
  if (transactions.length === 0) {
    log.info("No transactions to output");
    return undefined;
  }
  let buffer = Csv.writeCsv(csvPath, transactions, cols, true);
  log.info("Wrote:", csvPath);
  return buffer;
};

// data:
//  single: {statement,transactions,...}, or
//  array: [ {statement,transactions,...} ]
function getTransactionsForCsv(data, extraColFile, extraColParser) {
  let transactions = [];
  let numDescriptionCols = 0;
  let id = 0;
  // use array to support multi-user e.g. credit-card-breakdown-multi-user
  if (!Array.isArray(data)) {
    data = [data];
  }
  for (let d of data) {
    if (Array.isArray(d.transactions)) {
      for (let t of d.transactions) {
        // extra cols
        let o = {
          id: ++id
        };
        if (extraColFile) {
          o.file = d.file;
        }
        if (extraColParser) {
          o.parser = d.parser;
        }
        let marshalled = Object.assign(o, t);
        if (!marshalled.date) {
          marshalled.date = marshalled.transactionDate || marshalled.processDate;
        }

        // description
        delete marshalled.description;
        if (Array.isArray(t.description)) {
          // marshalled.description = t.description.join("\r\n");
          // multiple columns = description1, description2, ...
          let i = 1;
          for (let d of t.description) {
            marshalled["description" + i++] = d;
          }
          if (t.description.length > numDescriptionCols) {
            numDescriptionCols = t.description.length;
          }
        } else {
          console.error("INVALID description:", JSON.stringify(t));
        }

        transactions.push(marshalled);
      }
    }
  }

  // cols = "id","date","description1", ... ,"descriptionN","amount","balance"
  let cols = ["id", "date"];
  for (let i = 0; i < numDescriptionCols; ++i) {
    cols.push("description" + (i + 1));
  }
  cols = cols.concat(["amount", "balance"]);
  return { cols, transactions };
}

exports.getPdfResultSummary = function(data) {
  // support multi-user e.g. credit-card-breakdown-multi-user
  let numTransactions = 0;
  if (Array.isArray(data)) {
    // count all transactions
    for (let d of data) {
      numTransactions += d.transactions.length;
    }
    // HACK: summary for first user only
    data = data[0];
  } else {
    numTransactions = data.transactions.length;
  }

  return {
    numTransactions,
    parser: data.parser,
    accountNumber: data.statement.accountNumber,
    issuedOn: data.statement.dates.issuedOn,
    from: data.statement.dates.from,
    to: data.statement.dates.to,
    nameAddress: data.statement.nameAddress && data.statement.nameAddress.join("\n"), // quotes (") will be escaped as "" in writeCsv - see ./csv.js : objectArrayToCsvRows
    detected: undefined, // data.detected, // TODO: FUTURE: `detected` is like `flags` but for encoding probs = weird chars detected
    flags: undefined // data.flags, // TODO: FUTURE:
  };
};

//#endregion
