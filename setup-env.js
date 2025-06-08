const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExampleContent = `# M3U playlist URL
M3U_URL=https://example.com/path/to/playlist.m3u
`;

// Check if .env already exists
if (fs.existsSync(envPath)) {
    console.log('.env file already exists. Not overwriting.');
    console.log('Current .env content:');
    console.log(fs.readFileSync(envPath, 'utf8'));
} else {
    // Create .env file
    fs.writeFileSync(envPath, envExampleContent);
    console.log('.env file created successfully!');
    console.log('You can edit the M3U_URL in the .env file to use a different playlist.');
} 