const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios').default;
const crypto = require('crypto');
require('dotenv').config();

// Configure axios
axios.defaults.timeout = 60000;

// Get M3U URL from environment variable
const M3U_URL = process.env.M3U_URL || "https://example.com/path/to/playlist.m3u";

// Cache for parsed M3U data
let channelsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Parse M3U playlist
async function parseM3U(url) {
    // Check cache
    if (channelsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        return channelsCache;
    }

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

        // Update cache
        channelsCache = channels;
        cacheTimestamp = Date.now();

        return channels;
    } catch (error) {
        console.error('Error parsing M3U:', error.message);
        return channelsCache || []; // Return cached data if available
    }
}

// Get unique groups/categories from channels
function getCategories(channels) {
    const categories = [...new Set(channels.map(ch => ch.group))];
    return categories.filter(cat => cat); // Remove empty categories
}

// Create the addon
async function createAddon() {
    // Parse M3U to get categories for manifest
    const channels = await parseM3U(M3U_URL);
    const categories = getCategories(channels);

    // Build manifest dynamically
    const manifest = {
        id: 'org.community.yourIPTVm3u',
        version: '2.0.0',
        name: 'Your IPTV M3U',
        description: 'Stream M3U playlists in Stremio',
        logo: 'https://dl.strem.io/addon-logo.png',
        background: 'https://dl.strem.io/addon-background.jpg',

        // Addon capabilities
        resources: ['catalog', 'stream'],
        types: ['tv'],
        idPrefixes: ['yiptvM3U:'],

        // Catalog configuration
        catalogs: [{
            id: 'yiptvM3U:tv',
            name: 'TV Channels',
            type: 'tv',
            extra: [{
                name: 'genre',
                options: categories.length > 0 ? categories : ['Channels'],
                isRequired: true
            }]
        }],

        // Behavior hints
        behaviorHints: {
            configurable: false,
            adult: false
        }
    };

    // Create addon builder
    const builder = new addonBuilder(manifest);

    // Define catalog handler
    builder.defineCatalogHandler(async ({ type, id, extra }) => {
        console.log(`Catalog request: type=${type}, id=${id}, genre=${extra.genre}`);

        if (type !== 'tv') {
            return { metas: [] };
        }

        try {
            const channels = await parseM3U(M3U_URL);
            const genre = extra.genre || 'Channels';
            const filteredChannels = channels.filter(ch => ch.group === genre);

            const metas = filteredChannels.map(channel => ({
                id: `yiptvM3U:${channel.id}`,
                type: 'tv',
                name: channel.name,
                poster: null,
                posterShape: 'square',
                background: null,
                description: `${channel.group} - ${channel.name}`
            }));

            console.log(`Returning ${metas.length} channels for genre: ${genre}`);
            return { metas };
        } catch (error) {
            console.error('Catalog handler error:', error);
            return { metas: [] };
        }
    });

    // Define stream handler
    builder.defineStreamHandler(async ({ type, id }) => {
        console.log(`Stream request: type=${type}, id=${id}`);

        if (type !== 'tv') {
            return { streams: [] };
        }

        try {
            const streamId = id.replace('yiptvM3U:', '');
            const channels = await parseM3U(M3U_URL);
            const channel = channels.find(ch => ch.id === streamId);

            if (!channel) {
                console.log('Channel not found:', streamId);
                return { streams: [] };
            }

            // Return multiple stream sources for better compatibility
            const streams = [
                {
                    name: 'Stream',
                    title: channel.name,
                    url: channel.url,
                    // Behavior hints for better compatibility
                    behaviorHints: {
                        notWebReady: true,
                        proxyHeaders: {
                            request: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "*/*",
                                "Accept-Language": "en-US,en;q=0.9",
                                "Accept-Encoding": "gzip, deflate",
                                "Connection": "keep-alive"
                            }
                        }
                    }
                }
            ];

            // Add alternative stream if it's MPEG-TS
            if (channel.url.includes('.ts') || channel.url.includes('/ts/')) {
                streams.push({
                    name: 'Direct',
                    title: `${channel.name} (Direct)`,
                    url: channel.url,
                    behaviorHints: {
                        notWebReady: true
                    }
                });
            }

            console.log(`Returning ${streams.length} streams for channel: ${channel.name}`);
            return { streams };
        } catch (error) {
            console.error('Stream handler error:', error);
            return { streams: [] };
        }
    });

    return builder.getInterface();
}

module.exports = createAddon;
