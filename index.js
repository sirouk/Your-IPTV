const express = require("express");
const app = express();
const config = require('./config');
const MANIFEST = require('./manifest');
const { getManifest, getCatalog, getStream } = require("./addon");

const NodeCache = require("node-cache");
const myCache = new NodeCache({ stdTTL: 15 * 60 });

var respond = function (res, data) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
};

app.engine('html', require('ejs').renderFile);
app.set('views', __dirname);

app.get("/", function (req, res) {
  res.redirect("/configure");
});

app.get("/configure", function (req, res) {
  res.render('configure.html');
});

app.get('/manifest.json', async function (req, res) {
  if (myCache.has('manifest')) {
    respond(res, myCache.get('manifest'));
  } else {
    const manifest = await getManifest();
    if (manifest) {
      myCache.set('manifest', manifest);
      respond(res, manifest);
    } else {
      respond(res, MANIFEST);
    }
  }
});

app.get('/catalog/:type/:id/:extra?.json', async function (req, res) {
  let { type, id, extra } = req.params;
  let extraObj = {};

  if (extra) {
    try {
      extraObj = JSON.parse('{"' + decodeURI(extra.replace(/&/g, "\",\"").replace(/=/g, "\":\"")) + '"}');
    } catch (error) {
      console.log(error);
      return respond(res, { metas: [] });
    }
  }

  if (extraObj && extraObj.genre && extraObj.genre.includes("+")) {
    extraObj.genre = extraObj.genre.replace(/\+/g, ' ');
  }

  try {
    const cacheKey = `catalog-${type}-${id}-${extra}`;
    if (myCache.has(cacheKey)) {
      respond(res, myCache.get(cacheKey));
    } else {
      const metas = await getCatalog(type, extraObj.genre);
      if (metas.length > 0) {
        myCache.set(cacheKey, { metas: metas });
      }
      respond(res, { metas: metas });
    }
  } catch (error) {
    console.log(error);
    respond(res, { metas: [] });
  }
});

app.get('/stream/:type/:id.json', async function (req, res) {
  let { type, id } = req.params;

  try {
    const cacheKey = `stream-${type}-${id}`;
    if (myCache.has(cacheKey)) {
      respond(res, myCache.get(cacheKey));
    } else {
      const streams = await getStream(type, id);
      if (streams.length > 0) {
        myCache.set(cacheKey, { streams: streams });
      }
      respond(res, { streams: streams });
    }
  } catch (error) {
    console.log(error);
    respond(res, { streams: [] });
  }
});

if (module.parent) {
  module.exports = app;
} else {
  app.listen(config.port, function () {
    console.log(`Addon running on port ${config.port}`);
    console.log(`http://localhost:${config.port}/manifest.json`);
  });
}