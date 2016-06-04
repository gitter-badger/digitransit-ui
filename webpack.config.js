const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');
const csswring = require('csswring');
const StatsPlugin = require('stats-webpack-plugin');
const fs = require('fs');

require('coffee-script/register');

const port = process.env.HOT_LOAD_PORT || 9000;

function getLoadersConfig(env) {
  if (env === 'development') {
    return ([
      { test: /\.css$/, loaders: ['style', 'css', 'postcss']},
      { test: /\.cjsx$/, loaders: ['react-hot', 'coffee', 'cjsx']},
      { test: /\.coffee$/, loader: 'coffee' },
      { test: /\.json$/, loader: 'json'},
      { test: /\.scss$/, loaders: ['style', 'css', 'postcss', 'sass']},
      { test: /\.(eot|png|ttf|woff|svg)$/, loader: 'file'},
      { test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/,
        query: {
          'presets': ['es2015-webpack-loose', 'react', 'stage-0'],
          'plugins': [
            'transform-class-properties',
            path.join(__dirname, 'build/babelRelayPlugin'),
          ],
        },
      },
    ]);
  }
  return ([
    { test: /\.css$/, loader: ExtractTextPlugin.extract('style', 'css!postcss')},
    { test: /\.cjsx$/, loaders: ['coffee', 'cjsx']},
    { test: /\.coffee$/, loader: 'coffee' },
    { test: /\.json$/, loader: 'json'},
    { test: /\.scss$/, loader: ExtractTextPlugin.extract('style', 'css!postcss!sass')},
    { test: /\.(eot|png|ttf|woff|svg)$/, loader: 'file'},
    { test: /\.js$/,
      loader: 'babel',
      exclude: /node_modules/,
      query: {
        'presets': ['es2015-webpack-loose', 'react'],
        'plugins': [
          'transform-class-properties',
          path.join(__dirname, 'build/babelRelayPlugin'),
        ],
      },
    },
  ]);
}

function getAllPossibleLanguages() {
  const srcDirectory = 'app';
  return fs.readdirSync(srcDirectory)
    .filter((file) => /^config\.\w+\.coffee$/.test(file))
    .filter((file) => !/^config\.client\.coffee$/.test(file))
    .map((file) => require('./' + srcDirectory + '/' + file).availableLanguages)
    .reduce((languages, languages2) => languages.concat(languages2))
    .filter((language, position, languages) => languages.indexOf(language) === position);
}

function getSourceMapPlugin(testPattern,prefix) {
  return new webpack.SourceMapDevToolPlugin({
    test: testPattern,
    filename: '[file].map',
    append: '\n//# sourceMappingURL=' + prefix + '[url]',
    module: true,
    columns: true,
    lineToLine: true
  })
}

function getPluginsConfig(env) {
  const languageExpression = new RegExp('^./(' + getAllPossibleLanguages().join('|') + ')$');
  const momentExpression = /moment[\\\/]locale$/;
  const reactIntlExpression = /react-intl[\/\\]locale\-data$/;
  const intlExpression = /intl[\/\\]locale\-data[\/\\]jsonp$/;

  if (env === 'development') {
    return ([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.ContextReplacementPlugin(momentExpression, languageExpression),
      new webpack.ContextReplacementPlugin(reactIntlExpression, languageExpression),
      new webpack.ContextReplacementPlugin(intlExpression, languageExpression),
      new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('development')}}),
      new webpack.NoErrorsPlugin(),
    ]);
  }
  return ([
    new webpack.ContextReplacementPlugin(momentExpression, languageExpression),
    new webpack.ContextReplacementPlugin(reactIntlExpression, languageExpression),
    new webpack.ContextReplacementPlugin(intlExpression, languageExpression),
    new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('production')}}),
    new webpack.PrefetchPlugin('react'),
    new webpack.PrefetchPlugin('react-router'),
    new webpack.PrefetchPlugin('fluxible'),
    new webpack.PrefetchPlugin('leaflet'),
    new webpack.HashedModuleIdsPlugin(),
    getSourceMapPlugin(/\.(js)($|\?)/i,'/js/'),
    getSourceMapPlugin(/\.(css)($|\?)/i,'/css/'),
    new webpack.optimize.CommonsChunkPlugin({
      names: ['common', 'leaflet', 'manifest'],
    }),
    new StatsPlugin('../stats.json', {chunkModules: true}),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    // new webpack.optimize.DedupePlugin(), // TODO:crashes weirdly
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),
    new ExtractTextPlugin('css/[name].[chunkhash].css', {
      allChunks: true,
    }),
    new webpack.NoErrorsPlugin(),
  ]);
}

function getDirectories(srcDirectory) {
  return fs.readdirSync(srcDirectory).filter((file) => {
    return fs.statSync(path.join(srcDirectory, file)).isDirectory();
  });
}

function getDevelopmentEntry() {
  const entry = [
    'webpack-dev-server/client?http://localhost:' + port,
    'webpack/hot/dev-server',
    './app/client',
  ];
  return entry;
}

function getEntry() {
  const entry = {
    main: './app/client',
    common: [ // These come from all imports in client.cjsx
      'react',
      'react-dom',
      'react-relay',
      'react-router-relay',
      'fluxible-addons-react/provideContext',
      'react-tap-event-plugin',
      './app/util/store-listening-intl-provider',
      './app/history',
      'fluxible',
      'material-ui/styles/getMuiTheme',
      'material-ui/styles/MuiThemeProvider',
    ],
    leaflet: ['leaflet'],
  };

  const directories = getDirectories('./sass/themes');
  directories.forEach((theme) => {
    const entryPath = './sass/themes/' + theme + '/main.scss';
    entry[theme + '_theme'] = [entryPath];
  });

  return entry;
}

module.exports = {
  devtool: (process.env.NODE_ENV === 'development') ? 'eval' : false, // prod mode sourcemaps are hand defined in plugins.
  debug: (process.env.NODE_ENV === 'development') ? true : false,
  cache: true,
  entry: (process.env.NODE_ENV === 'development') ? getDevelopmentEntry() : getEntry(),
  output: {
    path: path.join(__dirname, '_static'),
    filename: (process.env.NODE_ENV === 'development') ? 'js/bundle.js' : 'js/[name].[chunkhash].js',
    chunkFilename: 'js/[name].[chunkhash].js',
    publicPath: ((process.env.NODE_ENV === 'development') ? 'http://localhost:' + port : (process.env.APP_PATH || '')) + '/',
  },
  resolveLoader: {
    modulesDirectories: ['node_modules'],
  },
  plugins: getPluginsConfig(process.env.NODE_ENV),
  resolve: {
    extensions: ['', '.js', '.cjsx', '.jsx', '.coffee'],
    alias: {},
  },
  module: {
    loaders: getLoadersConfig(process.env.NODE_ENV),
  },
  postcss: (process.env.NODE_ENV === 'development') ?
    [ autoprefixer({ browsers: ['last 3 version', '> 1%', 'IE 10'] })] :
    [ autoprefixer({ browsers: ['last 3 version', '> 1%', 'IE 10'] }), csswring],
  node: {
    net: 'empty',
    tls: 'empty',
  },
  externals: {
    'es6-promise': 'var Promise',
    'fetch': 'var fetch',
    'fbjs/lib/fetch': 'var fetch',
    './fetch': 'var fetch',
  },
  worker: {
    output: {
      filename: 'js/[hash].worker.js',
      chunkFilename: 'js/[id].[hash].worker.js',
    },
  },
};
