const https = require('https');
const fs = require('fs');
const express = require('express');
const app = express();

// Load SSL files
const options = {
  cert: fs.readFileSync('ssl/cert.pem'),
  key: fs.readFileSync('ssl/key.pem')
};

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from HTTPS!');
});

// Start server
https.createServer(options, app).listen(8443, () => {
  console.log('✅ HTTPS server running at https://localhost:8443');
});