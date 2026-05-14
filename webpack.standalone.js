'use strict'

const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const postcssPresetEnv = require('postcss-preset-env')
const cssnano = require('cssnano')

const config = require('./src/config')
const { graphConfig, uiConfig } = require('./src/graphing/config')

const featureToggles = config().production.featureToggles
const scssVariables = []

Object.entries(graphConfig).forEach(function ([key, value]) {
  scssVariables.push(`$${key}: ${value}px;`)
})
Object.entries(uiConfig).forEach(function ([key, value]) {
  scssVariables.push(`$${key}: ${value}px;`)
})
Object.entries(featureToggles).forEach(function ([key, value]) {
  scssVariables.push(`$${key}: ${value};`)
})

module.exports = {
  mode: 'production',
  context: __dirname,
  // common.js traz SCSS + imagens; site.js traz a lógica do radar
  entry: { main: ['./src/common.js', './src/site.js'] },
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: '',
    filename: 'standalone/[name].[contenthash].js',
    clean: false,
  },
  performance: { hints: false },
  resolve: {
    extensions: ['.js', '.ts'],
    fallback: { fs: false },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [{ loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } }],
      },
      {
        // Fontes e imagens: base64 inline no bundle JS
        test: /\.(eot|otf|ttf|woff|woff2|png|jpg|jpeg|gif|ico|svg)$/,
        exclude: /node_modules/,
        type: 'asset/inline',
      },
      {
        test: require.resolve('jquery'),
        loader: 'expose-loader',
        options: { exposes: ['$', 'jQuery'] },
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          // style-loader injeta CSS como <style> no bundle (sem arquivo .css separado)
          'style-loader',
          {
            loader: 'css-loader',
            options: { importLoaders: 1, modules: 'global', url: false },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  postcssPresetEnv({ browsers: 'last 2 versions' }),
                  cssnano({ preset: ['default', { discardComments: { removeAll: true } }] }),
                ],
              },
            },
          },
          {
            loader: 'sass-loader',
            options: { additionalData: scssVariables.join('\n') },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'standalone/index.html',
      chunks: ['main'],
      inject: 'body',
    }),
    new webpack.DefinePlugin({
      'process.env.CLIENT_ID': JSON.stringify(undefined),
      'process.env.API_KEY': JSON.stringify(undefined),
      'process.env.ENABLE_GOOGLE_AUTH': JSON.stringify('false'),
      'process.env.GTM_ID': JSON.stringify(undefined),
      'process.env.RINGS': JSON.stringify(process.env.RINGS),
      'process.env.QUADRANTS': JSON.stringify(process.env.QUADRANTS),
      'process.env.ADOBE_LAUNCH_SCRIPT_URL': JSON.stringify(undefined),
      'process.env.ENVIRONMENT': JSON.stringify('production'),
    }),
  ],
}
