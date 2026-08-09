import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { execSync } from 'child_process';

export class LicenseManager {
    // PUBLIC KEY ONLY! Used exclusively to verify signatures.
    // The private key is kept offline and used by the generation script.
    private readonly publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAypKRbbQ1cl4alzH6hJddetunUEiDqADpyMFn6zT3F8A=
-----END PUBLIC KEY-----`;

    private readonly licenseFileName = 'license.dat';

    /**
     * Generate a unique device ID based on hardware characteristics
     * Uses PowerShell to get stable identifiers like Motherboard UUID and OS Drive Serial
     */
    getDeviceId(): string {
        try {
            const components: string[] = [];

            // 1. Hostname
            components.push(os.hostname());

            if (os.platform() === 'win32') {
                try {
                    // Try to get Motherboard UUID via PowerShell
                    const uuidOutput = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8' });
                    if (uuidOutput && uuidOutput.trim()) {
                        components.push(uuidOutput.trim());
                    }
                } catch (e) {
                    console.error('Failed to get Motherboard UUID:', e);
                }
            } else {
                // Fallback for non-Windows (or just use MACs as before)
                components.push(os.platform());
                components.push(os.arch());
            }

            // Fallback: total memory
            components.push(os.totalmem().toString());

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
    getLicensePath(): string {
        try {
            const userDataPath = app.getPath('userData');
            return path.join(userDataPath, this.licenseFileName);
        } catch (error) {
            console.error('Error getting license path:', error);
            // Fallback to current directory if app path is not available
            return path.join(process.cwd(), this.licenseFileName);
        }
    }

    /**
     * Verify the license signature using Ed25519
     */
    verifySignature(data: string, signatureHex: string): boolean {
        try {
            const publicKey = crypto.createPublicKey(this.publicKeyPem);
            const signatureBuffer = Buffer.from(signatureHex, 'hex');
            
            return crypto.verify(
                null,
                Buffer.from(data, 'utf8'),
                publicKey,
                signatureBuffer
            );
        } catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }

    /**
     * Validate the license file
     * Returns validation status and details
     */
    validateLicense(): { valid: boolean, error?: string, message: string, deviceId?: string, licensedDeviceId?: string, generatedAt?: string } {
        try {
            // Check multiple potential locations for the license file
            const pathsToCheck = [
                this.getLicensePath(), // AppData
                path.join(process.cwd(), this.licenseFileName), // Current working dir
            ];
            
            // Try app path if available
            try {
                pathsToCheck.push(path.join(path.dirname(app.getAppPath()), this.licenseFileName));
            } catch (e) {}

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
                    message: 'No license file found. Please activate this application.',
                    deviceId: this.getDeviceId()
                };
            }

            // Read license file
            const licenseContent = fs.readFileSync(licensePath, 'utf8');
            let licenseObj;

            try {
                licenseObj = JSON.parse(licenseContent);
            } catch (error) {
                return {
                    valid: false,
                    error: 'INVALID_LICENSE_FORMAT',
                    message: 'License file is corrupted or invalid.',
                    deviceId: this.getDeviceId()
                };
            }

            const { data, signature } = licenseObj;

            if (!data || !signature) {
                return {
                    valid: false,
                    error: 'INVALID_LICENSE_FORMAT',
                    message: 'License file is missing data or signature.',
                    deviceId: this.getDeviceId()
                };
            }

            // 1. Verify Signature
            const stringifiedData = JSON.stringify(data);
            if (!this.verifySignature(stringifiedData, signature)) {
                return {
                    valid: false,
                    error: 'SIGNATURE_MISMATCH',
                    message: 'License signature is invalid. The license may have been tampered with.',
                    deviceId: this.getDeviceId()
                };
            }

            // 2. Validate device ID match
            const currentDeviceId = this.getDeviceId();
            if (data.deviceId !== currentDeviceId) {
                return {
                    valid: false,
                    error: 'DEVICE_MISMATCH',
                    message: 'This license is not valid for this device. Please contact support.',
                    deviceId: currentDeviceId,
                    licensedDeviceId: data.deviceId
                };
            }

            // License is valid
            return {
                valid: true,
                deviceId: currentDeviceId,
                generatedAt: data.generatedAt,
                message: 'License is valid'
            };

        } catch (error: any) {
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
    importLicense(sourcePath: string): { success: boolean, error?: string, [key: string]: any } {
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

            if (!validation.valid) {
                // Remove invalid license
                fs.unlinkSync(targetPath);
                return {
                    success: false,
                    error: validation.message,
                    ...validation
                };
            }

            return {
                success: true,
                ...validation
            };
        } catch (error: any) {
            console.error('Error importing license:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export default new LicenseManager();
