const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

// Serve static files from the current directory with proper MIME types
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Also serve files from node_modules
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Read SSL certificate and key from the certificates folder
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', 'server.cert'))
};

// Start HTTPS server
const PORT = 3003;
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`HTTPS server running at https://localhost:${PORT}`);
});