const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LicenseManager {
    constructor() {
        this.encryptionKey = 'electreact-license-key-2026-v1-secure'; // 32 chars for AES-256
        this.algorithm = 'aes-256-cbc';
        this.licenseFileName = 'license.dat';
    }

    /**
     * Generate a unique device ID based on hardware characteristics
     * Uses multiple identifiers to create a stable fingerprint
     */
    getDeviceId() {
        try {
            const components = [];

            // 1. Hostname (machine name)
            components.push(os.hostname());

            // 2. Platform and architecture
            components.push(os.platform());
            components.push(os.arch());

            // 3. CPU information (model and cores)
            const cpus = os.cpus();
            if (cpus && cpus.length > 0) {
                components.push(cpus[0].model);
                components.push(cpus.length.toString());
            }

            // 4. Total memory (as identifier)
            components.push(os.totalmem().toString());

            // 5. Network interfaces (MAC addresses)
            const networkInterfaces = os.networkInterfaces();
            const macAddresses = [];
            for (const interfaceName in networkInterfaces) {
                const interfaces = networkInterfaces[interfaceName];
                for (const iface of interfaces) {
                    // Skip internal and virtual interfaces
                    if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                        macAddresses.push(iface.mac);
                    }
                }
            }
            // Sort MAC addresses to ensure consistent order
            macAddresses.sort();
            components.push(...macAddresses);

            // Combine all components and create hash
            const fingerprint = components.join('|');
            const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');

            // Return first 16 characters for shorter device ID
            return hash.substring(0, 16).toUpperCase();
        } catch (error) {
            console.error('Error generating device ID:', error);
            throw new Error('Failed to generate device ID');
        }
    }

    /**
     * Get the path where license file should be stored
     */
    getLicensePath() {
        try {
            // Use app's user data directory (e.g., AppData/Roaming/electreact on Windows)
            const userDataPath = app.getPath('userData');
            return path.join(userDataPath, this.licenseFileName);
        } catch (error) {
            console.error('Error getting license path:', error);
            // Fallback to current directory if app path is not available
            return path.join(process.cwd(), this.licenseFileName);
        }
    }

    /**
     * Encrypt data using AES-256-CBC
     */
    encrypt(text) {
        try {
            // Create a 32-byte key from the encryption key string
            const key = crypto.createHash('sha256').update(this.encryptionKey).digest();

            // Generate random IV
            const iv = crypto.randomBytes(16);

            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Return IV + encrypted data (IV is needed for decryption)
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data using AES-256-CBC
     */
    decrypt(encryptedData) {
        try {
            // Create a 32-byte key from the encryption key string
            const key = crypto.createHash('sha256').update(this.encryptionKey).digest();

            // Split IV and encrypted data
            const parts = encryptedData.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];

            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Generate a license file for a specific device ID
     * @param {string} deviceId - The device ID to generate license for
     * @param {string} outputPath - Optional custom output path
     */
    generateLicense(deviceId, outputPath = null) {
        try {
            const licenseData = {
                deviceId: deviceId,
                generatedAt: new Date().toISOString(),
                appName: 'Electreact',
                version: '1.0.0'
            };

            const licenseJson = JSON.stringify(licenseData);
            const encryptedLicense = this.encrypt(licenseJson);

            const licensePath = outputPath || this.getLicensePath();

            // Ensure directory exists
            const dir = path.dirname(licensePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(licensePath, encryptedLicense, 'utf8');

            return {
                success: true,
                path: licensePath,
                deviceId: deviceId
            };
        } catch (error) {
            console.error('Error generating license:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate the license file
     * Returns validation status and details
     */
    validateLicense() {
        try {
            // Check multiple potential locations for the license file
            const pathsToCheck = [
                this.getLicensePath(), // AppData
                path.join(process.cwd(), this.licenseFileName), // Current working dir
                path.join(path.dirname(app.getAppPath()), this.licenseFileName) // Executable dir
            ];

            let licensePath = null;
            for (const p of pathsToCheck) {
                if (fs.existsSync(p)) {
                    licensePath = p;
                    break;
                }
            }

            // Check if license file exists
            if (!licensePath) {
                return {
                    valid: false,
                    error: 'NO_LICENSE_FILE',
                    message: 'No license file found. Please contact support to activate this application.',
                    deviceId: this.getDeviceId()
                };
            }

            // Read and decrypt license file
            const encryptedLicense = fs.readFileSync(licensePath, 'utf8');
            let licenseData;

            try {
                const decryptedLicense = this.decrypt(encryptedLicense);
                licenseData = JSON.parse(decryptedLicense);
            } catch (decryptError) {
                return {
                    valid: false,
                    error: 'INVALID_LICENSE_FORMAT',
                    message: 'License file is corrupted or invalid.',
                    deviceId: this.getDeviceId()
                };
            }

            // Get current device ID
            const currentDeviceId = this.getDeviceId();

            // Validate device ID match
            if (licenseData.deviceId !== currentDeviceId) {
                return {
                    valid: false,
                    error: 'DEVICE_MISMATCH',
                    message: 'This license is not valid for this device. Please contact support.',
                    deviceId: currentDeviceId,
                    licensedDeviceId: licenseData.deviceId
                };
            }

            // License is valid
            return {
                valid: true,
                deviceId: currentDeviceId,
                generatedAt: licenseData.generatedAt,
                message: 'License is valid'
            };

        } catch (error) {
            console.error('License validation error:', error);
            return {
                valid: false,
                error: 'VALIDATION_ERROR',
                message: 'Failed to validate license: ' + error.message,
                deviceId: this.getDeviceId()
            };
        }
    }

    /**
     * Get license status information
     */
    getLicenseStatus() {
        const validation = this.validateLicense();
        return {
            ...validation,
            licensePath: this.getLicensePath()
        };
    }

    /**
     * Import a license file from an external path
     * @param {string} sourcePath - Path to the license file to import
     */
    importLicense(sourcePath) {
        try {
            if (!fs.existsSync(sourcePath)) {
                return {
                    success: false,
                    error: 'Source license file not found'
                };
            }

            const licenseData = fs.readFileSync(sourcePath, 'utf8');
            const targetPath = this.getLicensePath();

            // Ensure directory exists
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(targetPath, licenseData, 'utf8');

            // Validate the imported license
            const validation = this.validateLicense();

            return {
                success: validation.valid,
                ...validation
            };
        } catch (error) {
            console.error('Error importing license:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new LicenseManager();
