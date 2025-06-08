const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.LANDING_PORT || 3650;

// Serve static files
app.use(express.static(path.join(__dirname, 'static')));

// Redirect root to the static index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Landing page available at: http://localhost:${PORT}`);
}); 