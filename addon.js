const axios = require('axios').default;
const crypto = require('crypto');
require('dotenv').config();

axios.defaults.headers.get["content-type"] = "application/json";
axios.defaults.timeout = 60000;
axios.defaults.method = "GET";

// Get M3U URL from environment variable or use default
const M3U_URL = process.env.M3U_URL || "https://example.com/path/to/playlist.m3u";

// Parse M3U playlist
async function parseM3U(url) {
    try {
        const response = await axios.get(url);
        const content = response.data;
        const lines = content.split('\n').filter(line => line.trim());

        const channels = [];
        let currentChannel = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                // Parse channel info
                const match = line.match(/group-title="([^"]+)"[,\s]*(.+)$/);
                if (match) {
                    currentChannel.group = match[1];
                    currentChannel.name = match[2];
                }
            } else if (line.startsWith('#EXTGRP:')) {
                // Additional group info (already captured above)
                continue;
            } else if (line.startsWith('http')) {
                // This is the stream URL
                currentChannel.url = line;
                if (currentChannel.name && currentChannel.url) {
                    // Generate a unique ID using MD5 hash of the URL
                    currentChannel.id = crypto.createHash('md5').update(currentChannel.url).digest('hex').substring(0, 16);
                    channels.push({ ...currentChannel });
                    currentChannel = {};
                }
            }
        }

        return channels;
    } catch (error) {
        console.error('Error parsing M3U:', error);
        return [];
    }
}

// Get unique groups/categories from channels
function getCategories(channels) {
    const categories = [...new Set(channels.map(ch => ch.group))];
    return categories.filter(cat => cat); // Remove empty categories
}

async function getManifest() {
    try {
        const channels = await parseM3U(M3U_URL);
        const categories = getCategories(channels);

        const manifest = {
            id: "org.community.yourIPTVm3u",
            version: "2.0.0",
            name: "Your IPTV M3U",
            description: "IPTV addon that parses M3U playlists",
            idPrefixes: ["yiptvM3U:"],
            catalogs: [
                {
                    id: "yiptvM3U:tv",
                    name: "TV Channels",
                    type: "tv",
                    extra: [{
                        name: "genre",
                        options: categories,
                        isRequired: true
                    }]
                }
            ],
            resources: ["catalog", "stream"],
            types: ["tv"],
            behaviorHints: { configurable: false }
        };

        return manifest;
    } catch (error) {
        console.error('Error generating manifest:', error);
        return null;
    }
}

async function getCatalog(type, genre) {
    try {
        if (type !== 'tv') return [];

        const channels = await parseM3U(M3U_URL);
        const filteredChannels = channels.filter(ch => ch.group === genre);

        const metas = filteredChannels.map(channel => ({
            id: `yiptvM3U:${channel.id}`,
            type: "tv",
            name: channel.name,
            poster: null, // M3U doesn't provide posters
            posterShape: "square"
        }));

        return metas;
    } catch (error) {
        console.error('Error getting catalog:', error);
        return [];
    }
}

async function getStream(type, id) {
    try {
        if (type !== 'tv') return [];

        const streamId = id.replace('yiptvM3U:', '');
        const channels = await parseM3U(M3U_URL);
        const channel = channels.find(ch => ch.id === streamId);

        if (!channel) return [];

        // Provide multiple stream options with different configurations
        const streams = [
            {
                name: "Primary Stream",
                title: channel.name,
                url: channel.url,
                behaviorHints: {
                    notWebReady: true,
                    proxyHeaders: {
                        request: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                            "Accept": "*/*",
                            "Accept-Language": "en-US,en;q=0.9",
                            "Accept-Encoding": "gzip, deflate",
                            "Connection": "keep-alive",
                            "Referer": "https://tv123.me/"
                        }
                    }
                }
            }
        ];

        // Add alternative stream format if URL ends with specific extensions
        if (channel.url.includes('.ts') || channel.url.includes('/ts/')) {
            streams.push({
                name: "MPEG-TS Stream",
                title: channel.name + " (TS)",
                url: channel.url,
                type: "tv",
                isLive: true,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: "tv-" + streamId
                }
            });
        }

        // Add a basic stream option
        streams.push({
            name: "Direct",
            title: channel.name + " (Direct)",
            url: channel.url,
            behaviorHints: {
                notWebReady: true
            }
        });

        console.log(`Returning ${streams.length} streams for channel: ${channel.name}`);
        return streams;
    } catch (error) {
        console.error('Error getting stream:', error);
        return [];
    }
}

module.exports = { getManifest, getCatalog, getStream };
