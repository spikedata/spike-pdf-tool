const path = require("path")

module.exports = {
  target: "node",
  resolve: {
    extensions: [".js"],
  },
  entry: {
    app: [path.join(__dirname, "/app")],
  },
  output: {
    path: path.join(__dirname, "..", "dist"),
    filename: "[name].js",
  },
  module: {
    rules: [{ test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }],
  },
}
