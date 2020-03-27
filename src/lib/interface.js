module.exports = {
  check(interfaceName, interfaceImpl, implementorName, implementorImpl) {
    let interfaceApi = Object.keys(interfaceImpl);
    let implementorApi = Object.keys(implementorImpl);
    // console.log("interface:", interfaceName, interfaceApi);
    // console.log("implementor:", implementorName, implementorApi);
    let missing = interfaceApi.filter(x => !implementorApi.includes(x));
    if (missing.length) {
      throw new Error(
        `${implementorName} has not got full coverage of ${interfaceName} API. Missing the following functions:\n${missing.join(
          "\n"
        )}`
      );
    }
  }
};
