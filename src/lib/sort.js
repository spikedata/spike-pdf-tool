exports.SortOrder = {
  ASC: "ASC",
  DESC: "DESC"
};

const isNumber = value => typeof value === "number" && value === value && Number.isFinite(value);

// arrayOfObjects = all elements are same object shape
// sort = key on object to sort by
// sortOrder = ASC or DESC
exports.fuzzySort = function(arrayOfObjects, sort, sortOrder) {
  return arrayOfObjects.sort((a, b) => {
    a = a[sort];
    b = b[sort];
    let comp;
    if (isNumber(a) || isNumber(b)) {
      // numbers
      if (a === undefined) {
        comp = -1;
      } else if (b === undefined) {
        comp = 1;
      } else {
        comp = a < b ? -1 : a === b ? 0 : 1;
      }
    } else {
      // everything else = string compare
      a = a === undefined ? "" : "" + a;
      b = b === undefined ? "" : "" + b;
      comp = a.localeCompare(b);
    }
    if (comp === 0) {
      return 0;
    } else if (sortOrder == exports.SortOrder.ASC) {
      return comp;
    } else {
      return -comp;
    }
  });
};
