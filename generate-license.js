const path = require('path');
const fs = require('fs');

// Import the LicenseManager
// Adjusting path to point to Services directory from src/main
const LicenseManager = require('../Services/LicenseManager');

// Get arguments
const args = process.argv.slice(2);

async function generate() {
    console.log('--- Electreact License Generator ---');

    // Check if device ID is provided
    let deviceId = args[0];

    // If no device ID provided, generate for current machine
    if (!deviceId) {
        console.log('No Device ID provided. Generating for CURRENT machine...');
        try {
            deviceId = LicenseManager.getDeviceId();
            console.log(`Detected Device ID: ${deviceId}`);
        } catch (error) {
            console.error('Error detecting device ID:', error.message);
            // If getDeviceId fails (e.g. missing OS info in some contexts), we can't proceed validation
            // But we might be able to manually enter one.
            if (!args[0]) process.exit(1);
        }
    } else {
        console.log(`Generating license for Device ID: ${deviceId}`);
    }

    // Generate the license
    console.log('Generating license file...');

    try {
        // When running as a script, we want to output to the current directory
        // or a specified one. The LicenseManager.generateLicense uses getLicensePath() default
        // which falls back to process.cwd() if app is not available.
        // We can explicitly pass a path to be sure.

        const outputPath = path.join(process.cwd(), 'license.dat');
        const result = LicenseManager.generateLicense(deviceId, outputPath);

        if (result.success) {
            console.log('\n✅ License generated successfully!');
            console.log(`📂 Location: ${result.path}`);
            console.log(`🔑 Device ID: ${result.deviceId}`);
            console.log('\nTo use this license:');
            console.log('1. Keep this file in the application data directory');
            console.log('   (Windows: %APPDATA%\\electreact\\license.dat)');
            console.log('   (It has been automatically placed in current directory)');
            console.log('2. OR send this file to the user with the matching Device ID');
        } else {
            console.error('\n❌ Failed to generate license:', result.error);
        }
    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
}

generate();
