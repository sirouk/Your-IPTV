const axios = require('axios');
const https = require('https');
require('dotenv').config();

const M3U_URL = process.env.M3U_URL || "https://example.com/path/to/playlist.m3u";

async function testStreamDetailed() {
    console.log('Advanced Stream Testing');
    console.log('======================\n');

    try {
        // Fetch M3U
        const response = await axios.get(M3U_URL);
        const lines = response.data.split('\n');

        // Get first stream URL
        const streamUrl = lines.find(line => line.trim().startsWith('http'));

        if (!streamUrl) {
            console.error('No stream URLs found in M3U');
            return;
        }

        console.log('Testing stream:', streamUrl.trim());
        console.log('-----------------------------------\n');

        // Test 1: Check with HEAD request
        console.log('1. HEAD Request Test:');
        try {
            const headResponse = await axios.head(streamUrl.trim(), {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            console.log('✅ Status:', headResponse.status);
            console.log('✅ Headers:', JSON.stringify(headResponse.headers, null, 2));
        } catch (error) {
            console.log('❌ HEAD request failed:', error.message);
        }

        // Test 2: Try to get first few bytes
        console.log('\n2. Stream Content Test:');
        try {
            const streamResponse = await axios.get(streamUrl.trim(), {
                timeout: 10000,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Range': 'bytes=0-1024'
                },
                maxRedirects: 5
            });

            const buffer = Buffer.from(streamResponse.data);
            console.log('✅ Got data, first 16 bytes (hex):', buffer.slice(0, 16).toString('hex'));
            console.log('✅ First 50 chars (if text):', buffer.slice(0, 50).toString('utf8').replace(/[^\x20-\x7E]/g, '.'));

            // Check for common stream formats
            if (buffer.slice(0, 3).toString('hex') === '474011') {
                console.log('✅ Detected: MPEG-TS stream');
            } else if (buffer.slice(0, 7).toString('utf8') === '#EXTM3U') {
                console.log('✅ Detected: HLS playlist (m3u8)');
            } else if (buffer.slice(0, 4).toString('hex') === '1a45dfa3') {
                console.log('✅ Detected: WebM/Matroska');
            } else {
                console.log('⚠️  Unknown format');
            }

        } catch (error) {
            console.log('❌ Stream request failed:', error.message);
            if (error.response) {
                console.log('   Response status:', error.response.status);
                console.log('   Response headers:', error.response.headers);
            }
        }

        // Test 3: Check redirect chain
        console.log('\n3. Following Redirects:');
        let currentUrl = streamUrl.trim();
        let redirectCount = 0;

        while (redirectCount < 5) {
            try {
                const response = await axios.get(currentUrl, {
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400,
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                });

                if (response.status >= 300 && response.status < 400) {
                    const newUrl = response.headers.location;
                    console.log(`   Redirect ${redirectCount + 1}: ${response.status} -> ${newUrl}`);
                    currentUrl = newUrl;
                    redirectCount++;
                } else {
                    console.log(`   Final URL: ${currentUrl}`);
                    console.log(`   Final status: ${response.status}`);
                    break;
                }
            } catch (error) {
                console.log(`   Error at redirect ${redirectCount}:`, error.message);
                break;
            }
        }

        // Test 4: VLC command
        console.log('\n4. Test with VLC:');
        console.log(`   vlc "${streamUrl.trim()}"`);
        console.log('   Or open VLC → Media → Open Network Stream → paste URL');

        // Test 5: Alternative testing
        console.log('\n5. Alternative Stream Testing:');
        console.log('   Try with ffprobe:');
        console.log(`   ffprobe -v quiet -print_format json -show_streams "${streamUrl.trim()}"`);
        console.log('\n   Try with curl:');
        console.log(`   curl -I -L "${streamUrl.trim()}"`);

    } catch (error) {
        console.error('Failed to fetch M3U:', error.message);
    }
}

// Run the test
testStreamDetailed(); 