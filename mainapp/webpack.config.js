const path = require("path");
const isProd = process.env.NODE_ENV === "production";

module.exports = {
  entry: {
    mainapp: "./src/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "static/"),
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?|png|jpe?g|gif)(\?[a-z0-9=&.]+)?$/,
        loader: "file-loader",
      },
      { test: /\.css$/, loader: ["style-loader", "css-loader"] },
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
    ],
  },
  devServer: {
    contentBase: "build",
    compress: true,
    historyApiFallback: {
      index: "index.html",
    },
  },
};