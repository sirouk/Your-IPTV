# Troubleshooting Playback Errors

## Common "Playback error" Solutions

### 1. Quick Diagnostics

Run these commands to diagnose the issue:

```bash
# Test your current M3U streams
npm run test:detailed

# Test with known working public streams
npm run test:public

# Basic stream test
npm run test:streams
```

### 2. Common Issues & Solutions

#### Issue: Streams require authentication
**Symptoms:** 
- Streams return HTTP 200 but won't play
- URLs work temporarily then stop

**Solutions:**
- The M3U provider might use token-based auth that expires
- Try getting a fresh M3U URL from your provider
- Some providers rotate URLs every few hours/days

#### Issue: Geo-blocking
**Symptoms:**
- Streams work in some locations but not others
- Getting timeout errors

**Solutions:**
- Use a VPN connected to the appropriate region
- Deploy the addon on a server in the correct region

#### Issue: Wrong stream format
**Symptoms:**
- Stremio shows "Playback error"
- Streams play in VLC but not Stremio

**Solutions:**
- Some streams need transcoding
- Try testing with public M3U first (see below)

### 3. Test with Public M3U

To verify your addon works correctly, test with a free public M3U:

1. Edit your `.env` file:
   ```
   M3U_URL=https://iptv-org.github.io/iptv/index.m3u
   ```

2. Restart the addon:
   ```bash
   npm start
   ```

3. Re-install in Stremio and test

If public streams work but yours don't, the issue is with your M3U source.

### 4. Advanced Debugging

#### Check stream format:
```bash
# Use ffprobe (install ffmpeg first)
ffprobe -v quiet -print_format json -show_streams "YOUR_STREAM_URL"

# Or use curl to check headers
curl -I -L "YOUR_STREAM_URL"
```

#### Test in VLC:
1. Open VLC
2. Media → Open Network Stream
3. Paste your stream URL
4. If it works in VLC but not Stremio, the stream might need special handling

### 5. Stream URL Formats

Stremio works best with:
- Direct HTTP/HTTPS streams (.mp4, .mkv, .ts)
- HLS streams (.m3u8)
- Standard MPEG-TS streams

Stremio may have issues with:
- Streams requiring special headers
- DRM-protected content
- Streams with authentication tokens
- RTMP/RTSP streams

### 6. Workarounds

#### Option 1: Use a stream proxy
Set up a proxy server that:
- Handles authentication
- Adds required headers
- Converts incompatible formats

#### Option 2: Find alternative M3U sources
- Look for providers that offer direct stream URLs
- Avoid sources with rotating tokens
- Test free sources first

#### Option 3: Use compatible sources
Known working sources:
- GitHub hosted M3U files
- Direct stream URLs without auth
- Public IPTV collections

### 7. Getting Help

When asking for help, provide:
1. Output of `npm run test:detailed`
2. Your M3U URL format (hide sensitive parts)
3. Whether public M3Us work
4. Error messages from console
5. Your region/country

### 8. Alternative Solutions

If your streams absolutely won't work:
1. Consider using a different IPTV app that supports your format
2. Set up a transcoding server (Jellyfin, Plex)
3. Use a stream proxy service
4. Find a different M3U provider 