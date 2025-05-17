const fs = require('fs');

try {
  const cert = fs.readFileSync('ssl/cert.pem');
  const key = fs.readFileSync('ssl/key.pem');
  console.log('✅ Cert size:', cert.length);
  console.log('✅ Key size:', key.length);
  console.log('🎉 Files read successfully!');
} catch (err) {
  console.error('❌ Error reading files:', err.message);
}
