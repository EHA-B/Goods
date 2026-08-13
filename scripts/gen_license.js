const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENCRYPTION_KEY = 'electreact-license-key-2026-v1-secure';
const ALGORITHM = 'aes-256-cbc';
const DEVICE_ID = '5EEF7CB7158A80DD';
const OUTPUT_PATH = path.join(__dirname, '..', 'license.dat');

function encrypt(text) {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

const licenseData = {
  deviceId: DEVICE_ID,
  generatedAt: new Date().toISOString(),
  appName: 'Electreact',
  version: '1.0.0'
};

const licenseJson = JSON.stringify(licenseData);
const encryptedLicense = encrypt(licenseJson);

fs.writeFileSync(OUTPUT_PATH, encryptedLicense, 'utf8');

console.log('✅ License generated successfully!');
console.log('📂 Location:', OUTPUT_PATH);
console.log('🔑 Device ID:', DEVICE_ID);
console.log('📅 Generated At:', licenseData.generatedAt);
