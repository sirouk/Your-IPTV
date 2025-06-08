const axios = require('axios');
require('dotenv').config();

const M3U_URL = process.env.M3U_URL || "https://example.com/path/to/playlist.m3u";

async function testStreams() {
    console.log('Testing M3U URL:', M3U_URL);
    console.log('-----------------------------------\n');

    try {
        // Fetch M3U
        const response = await axios.get(M3U_URL);
        const lines = response.data.split('\n');

        // Find first 3 stream URLs
        const streamUrls = lines.filter(line => line.trim().startsWith('http')).slice(0, 3);

        console.log(`Found ${streamUrls.length} stream URLs to test:\n`);

        // Test each stream
        for (let i = 0; i < streamUrls.length; i++) {
            const url = streamUrls[i].trim();
            console.log(`\nStream ${i + 1}: ${url}`);

            try {
                const streamResponse = await axios.head(url, {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                console.log('✅ Status:', streamResponse.status);
                console.log('✅ Content-Type:', streamResponse.headers['content-type'] || 'Not specified');
                console.log('✅ Content-Length:', streamResponse.headers['content-length'] || 'Not specified');
            } catch (error) {
                console.log('❌ Error:', error.message);
                if (error.response) {
                    console.log('   Status:', error.response.status);
                }
            }
        }

        console.log('\n-----------------------------------');
        console.log('Stream Test Tips:');
        console.log('1. If streams return 403/401, they may require authentication');
        console.log('2. If streams timeout, they may be geo-blocked');
        console.log('3. Try testing streams in VLC: File → Open Network Stream');
        console.log('4. Consider using a different M3U source if streams are protected');

    } catch (error) {
        console.error('Failed to fetch M3U:', error.message);
    }
}

testStreams(); 