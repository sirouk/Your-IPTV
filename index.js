const { serveHTTP } = require('stremio-addon-sdk');
const createAddon = require('./addon');
const config = require('./config');

// Create the addon interface
createAddon()
  .then(addonInterface => {
    // Serve the addon
    serveHTTP(addonInterface, {
      port: config.port
    });

    console.log(`Addon running on port ${config.port}`);
    console.log(`Install link: http://localhost:${config.port}/manifest.json`);
  })
  .catch(error => {
    console.error('Failed to create addon:', error);
    process.exit(1);
  });