# Your IPTV M3U Stremio Addon

A Stremio addon that parses M3U playlists and provides live TV channels, built with the official [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk).

## Features

- ✅ Built with official Stremio Addon SDK for best compatibility
- ✅ Parses M3U playlist format
- ✅ No authentication required  
- ✅ Configurable M3U URL via environment variable
- ✅ Built-in caching for better performance
- ✅ Supports live TV streaming
- ✅ CORS handled automatically by SDK
- ✅ Multiple stream sources for better compatibility

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
   This will automatically create a `.env` file with a placeholder M3U URL.

## Configuration

The M3U playlist URL is configured via the `M3U_URL` environment variable in the `.env` file:

```
M3U_URL=https://example.com/path/to/playlist.m3u
```

To use your M3U playlist:
1. Edit the `.env` file
2. Replace the URL with your own M3U playlist URL
3. Restart the addon

## Usage

### Start the addon:
```bash
npm start
```

The addon will be available at:
```
http://localhost:3649/manifest.json
```

### Optional: Start the landing page (for easy installation):
```bash
npm run start:landing
```

The landing page will be available at:
```
http://localhost:3650
```

## Adding to Stremio

### Method 1: Direct URL
1. Open Stremio
2. Go to Settings → Addons
3. Click "Install from URL"
4. Enter: `http://localhost:3649/manifest.json`
5. Click "Install"

### Method 2: Using the Landing Page
1. Start the landing page server
2. Visit `http://localhost:3650`
3. Click the "Install to Stremio" button

## Production Deployment

### Automatic Setup with SSL

We provide an installation script that sets up nginx with SSL using Let's Encrypt DNS challenges:

1. **Run the installation script on your server:**
   ```bash
   sudo ./install-nginx-ssl.sh
   ```

   The script will:
   - Install nginx-full and certbot
   - Set up DNS challenge for your domain
   - Configure nginx as a reverse proxy
   - Create systemd service for the addon
   - Set up automatic SSL renewal

2. **Deploy your addon files:**
   ```bash
   ./deploy-to-server.sh iptv.yourdomain.com
   ```

3. **On the server, complete setup:**
   ```bash
   # Edit the M3U URL
   sudo nano /opt/iptv-addon/.env
   
   # Start the service
   sudo systemctl start iptv-addon
   sudo systemctl enable iptv-addon
   
   # Check status
   sudo systemctl status iptv-addon
   ```

### Manual Deployment

If you prefer manual setup:

1. **Install dependencies on server:**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx nodejs npm
   ```

2. **Copy addon files to `/opt/iptv-addon/`**

3. **Set up nginx configuration** (see `install-nginx-ssl.sh` for example)

4. **Create systemd service** for auto-start

### SSL Certificate Options

The install script supports multiple DNS providers:
- Cloudflare (recommended)
- AWS Route53
- DigitalOcean
- Google Cloud DNS
- Manual DNS verification

### Accessing Your Addon

Once deployed, your addon will be available at:
- `https://iptv.yourdomain.com/manifest.json` (standard HTTPS)
- `https://iptv.yourdomain.com:3031/manifest.json` (alternative port)

## Environment Variables

- `M3U_URL` - The URL of the M3U playlist to parse (required)
- `PORT` - The port to run the addon server on (optional, defaults to 3649)
- `LANDING_PORT` - The port for the landing page (optional, defaults to 3650)

## Scripts

- `npm start` - Start the addon server
- `npm run start:landing` - Start the landing page server
- `npm run setup` - Create/update the .env file
- `npm run test:streams` - Test stream availability
- `./install-nginx-ssl.sh` - Set up nginx with SSL (run on server)
- `./deploy-to-server.sh` - Deploy addon to server

## Architecture

This addon follows Stremio SDK best practices:
- Uses `addonBuilder` for creating the addon interface
- Implements `defineCatalogHandler` for browsing channels
- Implements `defineStreamHandler` for providing streams
- Uses `serveHTTP` for serving the addon
- Includes proper error handling and logging
- Implements caching to reduce M3U playlist fetches

## Troubleshooting

### Addon won't install
- Make sure the addon is running (`npm start`)
- Verify the port is not in use
- Check firewall settings

### Streams won't play
- Verify your M3U URL is accessible
- Check if streams work in VLC player
- Some streams may require specific regions/VPN
- Check the console for error messages
- Run `npm run test:streams` to diagnose issues

### No channels showing
- Verify the M3U playlist format is correct
- Check if the M3U URL returns valid data
- Look for parsing errors in the console

### SSL Certificate Issues
- Ensure your domain DNS is properly configured
- Check that port 80 is open for Let's Encrypt verification
- Verify DNS TXT records are propagated (for DNS challenge)

## Development

The addon is built with:
- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk) - Official SDK
- axios - HTTP client for fetching M3U playlists
- dotenv - Environment variable management

## License

MIT 