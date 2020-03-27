// Timezone difference in hours and minutes e.g. +02:00, -06:00 or Z
function timeZoneStr() {
  let offset_hrs = parseInt(Math.abs(exports.TZ_OFFSET / 60));
  let offset_min = Math.abs(exports.TZ_OFFSET % 60);
  let tzStr;

  if (offset_hrs < 10) {
    offset_hrs = "0" + offset_hrs;
  }
  if (offset_min < 10) {
    offset_min = "0" + offset_min;
  }

  if (exports.TZ_OFFSET < 0) {
    tzStr = "+" + offset_hrs + ":" + offset_min;
  } else if (exports.TZ_OFFSET > 0) {
    tzStr = "-" + offset_hrs + ":" + offset_min;
  } else if (exports.TZ_OFFSET == 0) {
    tzStr = "Z";
  }

  return tzStr;
}

exports.TZ_OFFSET = new Date().getTimezoneOffset(); // e.g. -120 for GMT+0200
exports.TZ_OFFSET_MS = exports.TZ_OFFSET * 60 * 1000; // e.g. -120 * 60 * 1000 for GMT+0200
exports.TZ_STR = timeZoneStr(); // e.g. +02:00 for GMT+0200

exports.numDaysAgo = function(numDays, removeTime = true) {
  let today = new Date();
  let past = new Date(today.getTime() - numDays * 24 * 60 * 60 * 1000);
  if (removeTime) {
    return new Date(Date.UTC(past.getFullYear(), past.getMonth(), past.getDate()));
  } else {
    return past;
  }
};

exports.yyyy_mm_dd = function(d) {
  return d.toISOString().substr(0, 10);
};

exports.dd_mm_yyy = function(d, sep = "-", pad = true) {
  let dd = d.getDate();
  if (pad && dd < 10) dd = "0" + dd;
  let mm = d.getMonth() + 1;
  if (pad && mm < 10) mm = "0" + mm;
  let yy = d.getFullYear();
  return `${dd}${sep}${mm}${sep}${yy}`;
};

// convert local date to UTC
exports.addTzOffset = function(d) {
  let c = new Date(d.valueOf());
  c.setTime(d.getTime() + exports.TZ_OFFSET_MS);
  return c;
};

// convert date that was already in UTC but was mistakenly instantiated as a local date to actual local date
// e.g. timestamp in MySQL has no timezone, if written on server will be in UTC then read on laptop then will be instantiated as SAST date i.e. +2hrs from actual event
exports.subtractTzOffset = function(d) {
  let c = new Date(d.valueOf());
  c.setTime(d.getTime() - exports.TZ_OFFSET_MS);
  return c;
};

// e.g. 2019-06-26T02:00:00.000+02:00 for 2019-06-26T00:00:00.000Z
exports.toLocalString = function(d) {
  let c = exports.subtractTzOffset(d);
  return c.toISOString().substr(0, 23) + exports.TZ_STR;
};

// utcToday (2019-06-26T00:00:00.000Z = 2019-06-26T02:00:00.000+02:00)
exports.utcToday = function() {
  let now = new Date();
  let utcTodayFromLocalNow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  // let utcTodayFromUtcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utcTodayFromLocalNow;
};

// localToday (2019-06-25T22:00:00.000Z = 2019-06-26T00:00:00.000+02:00)
exports.localToday = function() {
  let localToday = new Date(new Date().setHours(0, 0, 0, 0));
  return localToday;
};

exports.utcEndOfDay = function(date) {
  let start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  return new Date(start.getTime() + 86400000 - 1); // tomorrow - 1 ms
};

exports.localEndOfDay = function(date) {
  let start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(start.getTime() + 86400000 - 1); // tomorrow - 1 ms
};

exports.utcEndOfToday = function() {
  let utc = exports.utcToday();
  return exports.utcEndOfDay(utc);
};

exports.localEndOfToday = function() {
  let local = exports.localToday();
  return exports.localEndOfDay(local);
};

/*
NOTES:

By default string dates are assumed to be UTC - unless TZ is supplied:
  > new Date("2019-06-26")
  2019-06-26T00:00:00.000Z
  > new Date("2019-06-26T00:00:00+02:00")
  2019-06-25T22:00:00.000Z

Means that args like `--from 2019-06-26` will create:
- utcToday (2019-06-26T00:00:00.000Z = 2019-06-26T02:00:00.000+02:00)
- not localToday (2019-06-25T22:00:00.000Z = 2019-06-26T00:00:00.000+02:00)

let now = new Date();
let localUTCToday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
let localUTCToday2 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
let localUTCToday3 = spikeCommon.dateExt.subtractTzOffset(localUTCToday);
let localUTCToday4 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
console.log("localUTCToday", localUTCToday.toISOString());
console.log("localUTCToday2", localUTCToday2.toISOString());
console.log("localUTCToday3", localUTCToday3.toISOString());
console.log("localUTCToday4", localUTCToday4.toISOString());
*/

const fullIsoDateRegex = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;
exports.isIsoDateString = function(d) {
  return fullIsoDateRegex.test(d);
};
