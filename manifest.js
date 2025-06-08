module.exports = {
    id: "org.community.YourIPTVM3U",
    version: "2.0.0",
    name: "Your IPTV M3U",
    logo: "https://dl.strem.io/addon-logo.png",
    description: "This addon brings Live TV channels from an M3U playlist to your Stremio.",
    types: ["tv"],
    background: "https://dl.strem.io/addon-background.jpg",
    resources: ["catalog", "stream"],
    catalogs: [],
    idPrefixes: ["yiptvM3U:"],
    behaviorHints: {
        configurable: false,
        adult: false
    }
};