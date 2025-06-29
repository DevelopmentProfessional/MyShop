const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

// Create ssl directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
}

// Generate a self-signed certificate using selfsigned
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// Save the certificates
fs.writeFileSync(path.join(sslDir, 'key.pem'), pems.private);
fs.writeFileSync(path.join(sslDir, 'cert.pem'), pems.cert);

console.log('SSL certificates generated successfully!'); 