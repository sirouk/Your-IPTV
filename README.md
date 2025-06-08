# Your IPTV M3U Stremio Addon

A Stremio addon that parses M3U playlists and provides live TV channels.

## Features

- Parses M3U playlist format
- No authentication required
- Configurable M3U URL via environment variable
- Caches parsed data for better performance
- Supports live TV streaming

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
   This will automatically create a `.env` file with the default M3U URL.

## Configuration

The M3U playlist URL is configured via the `M3U_URL` environment variable in the `.env` file:

```
M3U_URL=https://example.com/path/to/playlist.m3u
```

To use a different M3U playlist:
1. Edit the `.env` file
2. Replace the URL with your own M3U playlist URL
3. Restart the addon

## Usage

1. Start the addon:
   ```bash
   npm start
   ```

2. The addon will be available at:
   ```
   http://localhost:3649/manifest.json
   ```

3. Add the addon to Stremio:
   - Open Stremio
   - Go to Settings → Addons
   - Click "Install from URL"
   - Enter: `http://localhost:3649/manifest.json`

## Environment Variables

- `M3U_URL` - The URL of the M3U playlist to parse (required)
- `PORT` - The port to run the server on (optional, defaults to 3649)

## Scripts

- `npm start` - Start the addon server
- `npm run setup` - Create/update the .env file

## Troubleshooting

If the addon doesn't start:
1. Make sure the `.env` file exists (run `npm run setup` if not)
2. Verify your M3U URL is accessible
3. Check that port 3649 is not in use 