const path = require('path');
const nodeExternals = require('webpack-node-externals');

let {
  NODE_ENV = 'production',
} = process.env;

module.exports = {
  entry: './src/index.ts',
  mode: NODE_ENV, 
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  // TODO FIX FOR CLASS NAMES BECOMING MANGLED, BUT NEED TO FIX.
  optimization: {
    minimize: false,
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  externals: [nodeExternals()],
  watch: NODE_ENV !== "production",
};