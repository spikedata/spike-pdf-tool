const deepExtend = require("deep-extend")

exports.mergeObjectsMutate = function(a, b) {
  deepExtend(a, b)
}

exports.mergeObjectsClone = function(a, b) {
  let c = exports.clone(a)
  return deepExtend(c, b)
}

exports.clone = function(a) {
  return deepExtend({}, a)
}

exports.arrayToObject = function(array, key) {
  return array.reduce((obj, item) => {
    obj[item[key]] = item
    return obj
  }, {})
}

exports.entriesToObject = function(array, keyElement = 0) {
  let valueElement = keyElement === 0 ? 1 : 0
  return array.reduce((obj, item) => {
    obj[item[keyElement]] = item[valueElement]
    return obj
  }, {})
}

exports.addMissingMutate = function(into, from) {
  let keys = Object.keys(from)
  for (let k of keys) {
    if (!into[k]) {
      into[k] = from[k]
    }
  }
}
