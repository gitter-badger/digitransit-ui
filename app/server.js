// React
import React from 'react';
import ReactDOM from 'react-dom/server';

// Routing and state handling
import match from 'react-router/lib/match';
import RouterContext from 'react-router/lib/RouterContext';
import createHistory from 'react-router/lib/createMemoryHistory';
import FluxibleComponent from 'fluxible-addons-react/FluxibleComponent';

// Libraries
import serialize from 'serialize-javascript';
import { IntlProvider } from 'react-intl';
import polyfillService from 'polyfill-service';
import fs from 'fs';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

// Application
import application from './app';
import config from './config';
import translations from './translations';
import ApplicationHtml from './html';

const port = process.env.HOT_LOAD_PORT || 9000;

// Look up paths for various asset files
const appRoot = `${process.cwd()}/`;

const svgSprite = fs.readFileSync(`${appRoot}static/svg-sprite.${config.CONFIG}.svg`).toString();
const geolocationStarter = fs.readFileSync(`${appRoot}static/geolocation.js`).toString();

let stats;
let manifest;
let css;

if (process.env.NODE_ENV !== 'development') {
  stats = require('../stats.json'); // eslint-disable-line global-require
  manifest = fs.readFileSync(`${appRoot}_static/${stats.assetsByChunkName.manifest[0]}`);
  css = [
    <link
      rel="stylesheet"
      type="text/css"
      href={`${config.APP_PATH}/${stats.assetsByChunkName.main[1]}`}
    />,
    <link
      rel="stylesheet"
      type="text/css"
      href={`${config.APP_PATH}/${stats.assetsByChunkName[`${config.CONFIG}_theme`][1]}`}
    />,
  ];
}

function getPolyfills(userAgent) {
  // Do not trust Samsung, LG
  // see https://digitransit.atlassian.net/browse/DT-360
  // https://digitransit.atlassian.net/browse/DT-445
  if (!userAgent || /(LG-|GT-|SM-|SamsungBrowser|Google Page Speed Insights)/.test(userAgent)) {
    userAgent = ''; // eslint-disable-line no-param-reassign
  }

  const features = {
    'Array.from': { flags: ['gated'] },
    'Array.prototype.find': { flags: ['gated'] },
    'Array.prototype.includes': { flags: ['gated'] },
    atob: { flags: ['gated'] },
    es5: { flags: ['gated'] },
    fetch: { flags: ['gated'] },
    Intl: { flags: ['always', 'gated'] },
    matchMedia: { flags: ['gated'] },
    'Object.assign': { flags: ['gated'] },
    Promise: { flags: ['gated'] },
    setImmediate: { flags: ['gated'] },
    'String.prototype.endsWith': { flags: ['gated'] },
    'String.prototype.repeat': { flags: ['gated'] },
    'String.prototype.startsWith': { flags: ['gated'] },
    Symbol: { flags: ['gated'] },
    requestAnimationFrame: { flags: ['gated'] },
  };

  for (const language of config.availableLanguages) {
    features[`Intl.~locale.${language}`] = {
      flags: ['always', 'gated'],
    };
  }

  return polyfillService.getPolyfillString({
    uaString: userAgent,
    features,
    minify: true,
    unknown: 'polyfill',
  });
}

function processFeedback(req, res) {
  if (req.headers.dnt === 1) {
    return;
  }

  const visitCount = req.cookies.vc | 0;
  res.cookie('vc', visitCount + 1);
}

function getScripts(req) {
  if (process.env.NODE_ENV === 'development') {
    const host =
      (req.headers.host != null ? req.headers.host.split(':')[0] : void 0) || 'localhost';

    return <script async src={`//${host}:${port}/js/bundle.js`} />;
  }
  return [
    <script dangerouslySetInnerHTML={{ __html: manifest }} />,
    <script src={`${config.APP_PATH}/${stats.assetsByChunkName.common[0]}`} />,
    <script src={`${config.APP_PATH}/${stats.assetsByChunkName.leaflet[0]}`} />,
    <script src={`${config.APP_PATH}/${stats.assetsByChunkName.main[0]}`} />,
  ];
}

function getContent(context, renderProps, locale, userAgent) {
  // Ugly way to see if this is a Relay RootComponent
  // until Relay gets server rendering capabilities
  if (renderProps.components.some(i => i instanceof Object && i.hasFragment)) {
    return '';
  }

  // TODO: This should be moved to a place to coexist with similar content from client.js
  return ReactDOM.renderToString(
    <FluxibleComponent context={context.getComponentContext()}>
      <IntlProvider locale={locale} messages={translations[locale]}>
        <MuiThemeProvider muiTheme={getMuiTheme({}, { userAgent })}>
          <RouterContext {...renderProps} />
        </MuiThemeProvider>
      </IntlProvider>
    </FluxibleComponent>
  );
}

function getHtml(context, renderProps, locale, polyfills, req) {
  // Render content in order to create required meta-tags using react-hemet
  getContent(context, renderProps, locale, req.headers['user-agent']);

  return ReactDOM.renderToStaticMarkup(
    <ApplicationHtml
      css={process.env.NODE_ENV === 'development' ? false : css}
      svgSprite={svgSprite}
      content=""
      // TODO: temporarely disable server-side rendering in order to fix issue with having different
      // content from the server, which breaks leaflet integration
      // getContent(context, renderProps, locale, req.headers['user-agent'])
      polyfill={polyfills}
      state={`window.state=${serialize(application.dehydrate(context))};`}
      locale={locale} scripts={getScripts(req)}
      fonts={config.URL.FONT}
      config={`window.config=${JSON.stringify(config)}`}
      geolocationStarter={geolocationStarter}
    />
  );
}

export default function (req, res, next) {
  processFeedback(req, res);
  const locale = req.cookies.lang ||
    req.acceptsLanguages(config.availableLanguages) ||
    config.defaultLanguage;
  const context = application.createContext();

  // required by material-ui
  global.navigator = { userAgent: req.headers['user-agent'] };

  const location = createHistory({ basename: config.APP_PATH }).createLocation(req.url);

  match({
    routes: context.getComponent(),
    location,
  }, (error, redirectLocation, renderProps) => {
    if (redirectLocation) {
      res.redirect(301, redirectLocation.pathname + redirectLocation.search);
    } else if (error) {
      next(error);
    } else if (!renderProps) {
      res.status(404).send('Not found');
    } else {
      const promises = [getPolyfills(req.headers['user-agent'])];

      if (renderProps.components[1].loadAction) {
        renderProps.components[1]
          .loadAction(renderProps.params)
          .forEach(action => promises.push(context.executeAction(action[0], action[1])));
      }

      Promise.all(promises).then(results =>
        res.send(`<!doctype html>${getHtml(context, renderProps, locale, results[0], req)}`)
      ).catch(err => {
        if (err) { next(err); }
      });
    }
  });
}