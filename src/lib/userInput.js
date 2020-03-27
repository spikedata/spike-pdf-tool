const read = require("read")

exports.question = async function(prompt, silent, replace = "*", defaultVal) {
  return await new Promise((resolve, reject) => {
    read({ prompt, silent, replace, default: defaultVal }, function(
      error,
      input
    ) {
      if (error) {
        return reject(error) // you can catch this with `catch (ex)` then check for `ex.message === "canceled"`
      }
      return resolve(input)
    })
  })
}
