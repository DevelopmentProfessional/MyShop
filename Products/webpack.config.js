const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: './Scanner.js',
  output: {
    filename: process.env.NODE_ENV === 'production' ? 'bundle.min.js' : 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' }
      }
    ]
  },
  resolve: {
    fallback: {
      "fs": false,
      "path": false
    },
    extensions: ['.js', '.jsx'],
    alias: {
      'quagga': path.resolve(__dirname, 'quaggaJS/dist/quagga.min.js')
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      inject: 'body',
      scriptLoading: 'defer'
    })
  ],
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
    usedExports: true
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
      publicPath: '/',
      serveIndex: true,
      watch: true
    },
    hot: true,
    open: true,
    port: 3003,
    historyApiFallback: true,
    compress: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    devMiddleware: {
      writeToDisk: true
    }
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  }
}; 