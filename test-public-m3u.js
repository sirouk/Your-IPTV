// Test with a known working public M3U playlist
const axios = require('axios');

// Free, public M3U playlists for testing
const PUBLIC_M3U_URLS = [
    {
        name: "Free IPTV (News/General)",
        url: "https://iptv-org.github.io/iptv/index.m3u"
    },
    {
        name: "Pluto TV",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us_pluto.m3u"
    },
    {
        name: "Samsung TV Plus",
        url: "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us_samsung.m3u"
    }
];

async function testPublicM3U() {
    console.log('Testing Public M3U Playlists');
    console.log('============================\n');

    for (const playlist of PUBLIC_M3U_URLS) {
        console.log(`\nTesting: ${playlist.name}`);
        console.log(`URL: ${playlist.url}`);
        console.log('-'.repeat(50));

        try {
            const response = await axios.get(playlist.url, { timeout: 10000 });
            const lines = response.data.split('\n');

            // Count channels
            const channels = lines.filter(line => line.trim().startsWith('http')).length;
            console.log(`✅ Found ${channels} channels`);

            // Get first channel
            const firstChannelIndex = lines.findIndex(line => line.includes('#EXTINF:'));
            if (firstChannelIndex >= 0) {
                const channelInfo = lines[firstChannelIndex];
                const channelUrl = lines.slice(firstChannelIndex + 1).find(line => line.trim().startsWith('http'));

                const nameMatch = channelInfo.match(/,(.+)$/);
                const channelName = nameMatch ? nameMatch[1] : 'Unknown';

                console.log(`\nFirst channel: ${channelName}`);
                console.log(`Stream URL: ${channelUrl?.trim()}`);

                // Test the stream
                if (channelUrl) {
                    try {
                        const streamTest = await axios.head(channelUrl.trim(), {
                            timeout: 5000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0'
                            }
                        });
                        console.log(`✅ Stream accessible - Status: ${streamTest.status}`);
                    } catch (error) {
                        console.log(`⚠️  Stream test failed: ${error.message}`);
                    }
                }
            }

            console.log(`\n💡 To test this playlist with the addon:`);
            console.log(`   1. Edit your .env file`);
            console.log(`   2. Set: M3U_URL=${playlist.url}`);
            console.log(`   3. Restart the addon`);

        } catch (error) {
            console.log(`❌ Failed to fetch playlist: ${error.message}`);
        }
    }

    console.log('\n\nRecommendations:');
    console.log('================');
    console.log('1. Try one of the public playlists above to verify your addon works');
    console.log('2. If public playlists work but yours doesn\'t, the issue is likely:');
    console.log('   - Authentication/token requirements');
    console.log('   - Geo-blocking');
    console.log('   - DRM protection');
    console.log('   - Expired or rotating URLs');
    console.log('\n3. For protected streams, you might need:');
    console.log('   - A proxy server that handles authentication');
    console.log('   - VPN to bypass geo-restrictions');
    console.log('   - Different stream source');
}

testPublicM3U(); 