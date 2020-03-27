const util = require("util");

exports.stringifyErrors = function(args) {
  // stringify errors (otherwise just error is printed)
  if (args && args.length > 0) {
    for (let i = 0; i < args.length; ++i) {
      if (args[i] instanceof Error) {
        args[i] = util.format(args[i]);
      }
    }
  }
};
