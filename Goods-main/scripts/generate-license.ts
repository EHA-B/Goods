import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// PRIVATE KEY ONLY! Do NOT ship this script with the app!
const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIEa7/B7UXfqFSZPJZM9X2VxaCoUCBOEh9hoUaxD5l9fl
-----END PRIVATE KEY-----`;

function generateLicense(deviceId: string, outputPath: string) {
    try {
        const data = {
            deviceId,
            generatedAt: new Date().toISOString(),
            appName: 'Goods App',
            version: '1.0.0'
        };

        const stringifiedData = JSON.stringify(data);

        // Sign the data using Ed25519 Private Key
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const signature = crypto.sign(
            null,
            Buffer.from(stringifiedData, 'utf8'),
            privateKey
        );

        // Create the final license object
        const licenseObj = {
            data,
            signature: signature.toString('hex')
        };

        const licenseJson = JSON.stringify(licenseObj, null, 2);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, licenseJson, 'utf8');

        console.log('\n✅ License generated successfully!');
        console.log(`📂 Location: ${outputPath}`);
        console.log(`🔑 Device ID: ${deviceId}`);
    } catch (error) {
        console.error('Error generating license:', error);
    }
}

// Get arguments
const args = process.argv.slice(2);

if (args.length < 1) {
    console.log('Usage: npx ts-node scripts/generate-license.ts <DEVICE_ID>');
    process.exit(1);
}

const deviceId = args[0];
const outputPath = path.join(process.cwd(), 'license.dat');

console.log('--- Goods App License Generator ---');
console.log(`Generating license for Device ID: ${deviceId}`);
generateLicense(deviceId, outputPath);
