const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create ssl directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
}

// Generate a new key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Create a simple self-signed certificate
const cert = {
  version: 2,
  serialNumber: crypto.randomBytes(16).toString('hex'),
  subject: {
    commonName: 'localhost',
    organizationName: 'Shopy',
    countryName: 'US'
  },
  issuer: {
    commonName: 'localhost',
    organizationName: 'Shopy',
    countryName: 'US'
  },
  notBefore: new Date(),
  notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  publicKey: publicKey
};

// Convert certificate to PEM format
const certPem = `-----BEGIN CERTIFICATE-----\n${Buffer.from(JSON.stringify(cert)).toString('base64')}\n-----END CERTIFICATE-----`;

// Save the certificates
fs.writeFileSync(path.join(sslDir, 'key.pem'), privateKey);
fs.writeFileSync(path.join(sslDir, 'cert.pem'), certPem);

console.log('SSL certificates generated successfully!'); 