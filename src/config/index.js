module.exports = {
  default: require("./default"),

  checkConfig: function(config) {
    if (this[config]) {
      return true;
    } else {
      let configs = Object.keys(this)
        .filter(x => x !== "checkConfig")
        .join("\n");
      console.error(`invalid config, valid options = \n${configs}`);
      return false;
    }
  }
};
