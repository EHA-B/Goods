const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3');
const { app } = require('electron');

function getKnex() {
    if (!global.__knex) {
        const error = new Error('Database is not initialized');
        error.code = 'DATABASE_NOT_INITIALIZED';
        throw error;
    }
    return global.__knex;
}

function createError(code, message, details) {
    const error = new Error(message);
    error.code = code;
    if (details !== undefined) error.details = details;
    return error;
}

function escapeSqliteString(value) {
    return String(value).replace(/'/g, "''");
}

function timestampForFile(date = new Date()) {
    return date.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
}

class BackupController {
    getDatabasePath() {
        return path.join(app.getPath('userData'), 'farmer-market.db');
    }

    getEmergencyBackupDirectory() {
        return path.join(app.getPath('userData'), 'backups');
    }

    async validateBackupFile(sourcePath) {
        if (!sourcePath || typeof sourcePath !== 'string') {
            throw createError('SOURCE_PATH_REQUIRED', 'Backup source path is required');
        }

        const resolvedPath = path.resolve(sourcePath);
        let stat;
        try {
            stat = await fs.promises.stat(resolvedPath);
        } catch {
            throw createError('BACKUP_FILE_NOT_FOUND', 'Backup file was not found');
        }

        if (!stat.isFile() || stat.size < 100) {
            throw createError('INVALID_BACKUP_FILE', 'The selected file is not a valid database backup');
        }

        const handle = await fs.promises.open(resolvedPath, 'r');
        try {
            const header = Buffer.alloc(16);
            await handle.read(header, 0, 16, 0);
            if (header.toString('utf8') !== 'SQLite format 3\u0000') {
                throw createError('INVALID_BACKUP_FILE', 'The selected file is not a SQLite database');
            }
        } finally {
            await handle.close();
        }

        const validation = await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(resolvedPath, sqlite3.OPEN_READONLY, (openError) => {
                if (openError) {
                    reject(createError('BACKUP_OPEN_FAILED', 'Could not open the backup database', openError.message));
                    return;
                }

                db.get('PRAGMA integrity_check', [], (integrityError, integrityRow) => {
                    if (integrityError) {
                        db.close(() => reject(createError('BACKUP_INTEGRITY_CHECK_FAILED', 'Could not verify backup integrity', integrityError.message)));
                        return;
                    }

                    const integrityResult = integrityRow && Object.values(integrityRow)[0];
                    if (String(integrityResult).toLowerCase() !== 'ok') {
                        db.close(() => reject(createError('CORRUPTED_BACKUP', 'The backup database is corrupted', integrityResult)));
                        return;
                    }

                    db.all(
                        `SELECT name FROM sqlite_master WHERE type = 'table'`,
                        [],
                        (tablesError, rows) => {
                            db.close((closeError) => {
                                if (tablesError) {
                                    reject(createError('BACKUP_SCHEMA_CHECK_FAILED', 'Could not inspect backup schema', tablesError.message));
                                    return;
                                }
                                if (closeError) {
                                    reject(createError('BACKUP_CLOSE_FAILED', 'Could not close backup validation connection', closeError.message));
                                    return;
                                }

                                const tables = new Set((rows || []).map((row) => String(row.name).toLowerCase()));
                                const requiredTables = ['settings', 'products', 'customers', 'suppliers', 'cashboxes'];
                                const missingTables = requiredTables.filter((name) => !tables.has(name.toLowerCase()));
                                if (missingTables.length > 0) {
                                    reject(createError(
                                        'INCOMPATIBLE_BACKUP',
                                        'The selected database is not a compatible GoodsApp backup',
                                        { missingTables },
                                    ));
                                    return;
                                }

                                resolve({
                                    path: resolvedPath,
                                    size: stat.size,
                                    modifiedAt: stat.mtime.toISOString(),
                                    tablesCount: tables.size,
                                });
                            });
                        },
                    );
                });
            });
        });

        return validation;
    }

    async createBackup(destinationPath) {
        if (!destinationPath || typeof destinationPath !== 'string') {
            throw createError('DESTINATION_PATH_REQUIRED', 'Backup destination path is required');
        }

        const dbPath = path.resolve(this.getDatabasePath());
        const destination = path.resolve(destinationPath);

        if (destination === dbPath) {
            throw createError('INVALID_BACKUP_DESTINATION', 'The backup cannot overwrite the active database');
        }

        await fs.promises.mkdir(path.dirname(destination), { recursive: true });

        const knex = getKnex();
        await knex.raw('PRAGMA wal_checkpoint(FULL)');

        const temporaryPath = `${destination}.tmp-${process.pid}-${Date.now()}`;
        await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);

        try {
            // VACUUM INTO creates a consistent standalone SQLite snapshot while the app is running.
            await knex.raw(`VACUUM INTO '${escapeSqliteString(temporaryPath)}'`);
            const validation = await this.validateBackupFile(temporaryPath);

            await fs.promises.copyFile(temporaryPath, destination);
            await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);

            const result = {
                success: true,
                destination,
                size: validation.size,
                createdAt: new Date().toISOString(),
            };

            return result;
        } catch (error) {
            await fs.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
            if (error && error.code) throw error;
            throw createError('BACKUP_CREATE_FAILED', 'Failed to create database backup', error?.message);
        }
    }

    async prepareRestore(sourcePath) {
        const source = path.resolve(sourcePath || '');
        const dbPath = path.resolve(this.getDatabasePath());

        if (source === dbPath) {
            throw createError('INVALID_RESTORE_SOURCE', 'The active database cannot be restored onto itself');
        }

        const validation = await this.validateBackupFile(source);

        const emergencyDirectory = this.getEmergencyBackupDirectory();
        await fs.promises.mkdir(emergencyDirectory, { recursive: true });
        const emergencyBackupPath = path.join(
            emergencyDirectory,
            `before-restore-${timestampForFile()}.db`,
        );

        await this.createBackup(emergencyBackupPath);

        return {
            sourcePath: source,
            emergencyBackupPath,
            validation,
        };
    }

    async applyRestore(sourcePath) {
        const source = path.resolve(sourcePath || '');
        await this.validateBackupFile(source);

        const dbPath = path.resolve(this.getDatabasePath());
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;

        try {
            // Pause slightly to ensure SQLite file handles are released by OS
            await new Promise((resolve) => setTimeout(resolve, 150));

            // Clean up journal files if present
            await fs.promises.rm(walPath, { force: true }).catch(() => undefined);
            await fs.promises.rm(shmPath, { force: true }).catch(() => undefined);

            // Directly copy the backup file over the active database file
            await fs.promises.copyFile(source, dbPath);

            return { success: true, restoredFrom: source };
        } catch (error) {
            if (error && error.code) throw error;
            throw createError('RESTORE_APPLY_FAILED', 'Failed to replace the active database', error?.message);
        }
    }

    async getAutoBackupConfig() {
        const knex = getKnex();
        const settings = await knex('settings').whereIn('setting_key', [
            'auto_backup_enabled',
            'auto_backup_interval',
            'auto_backup_directory',
            'last_auto_backup',
        ]);

        const config = {
            enabled: false,
            interval: 'daily',
            directory: '',
            lastBackup: null,
        };

        for (const row of settings) {
            if (row.setting_key === 'auto_backup_enabled') config.enabled = row.setting_value === 'true';
            if (row.setting_key === 'auto_backup_interval') config.interval = row.setting_value;
            if (row.setting_key === 'auto_backup_directory') config.directory = row.setting_value;
            if (row.setting_key === 'last_auto_backup') config.lastBackup = row.setting_value;
        }

        return config;
    }

    async setAutoBackupConfig(input = {}) {
        const enabled = Boolean(input.enabled);
        const interval = input.interval || 'daily';
        const directory = typeof input.directory === 'string' ? input.directory.trim() : '';

        if (!['daily', 'weekly'].includes(interval)) {
            throw createError('INVALID_BACKUP_INTERVAL', 'Backup interval must be daily or weekly');
        }
        if (enabled && !directory) {
            throw createError('BACKUP_DIRECTORY_REQUIRED', 'Auto-backup directory is required');
        }

        if (enabled) {
            await fs.promises.mkdir(directory, { recursive: true });
            await fs.promises.access(directory, fs.constants.W_OK);
        }

        const knex = getKnex();
        await knex.transaction(async (trx) => {
            const keys = {
                auto_backup_enabled: String(enabled),
                auto_backup_interval: interval,
                auto_backup_directory: directory,
                last_auto_backup: input.lastBackup,
            };

            for (const [key, value] of Object.entries(keys)) {
                if (value === undefined || value === null) continue;

                const existing = await trx('settings').where('setting_key', key).first();
                if (existing) {
                    await trx('settings').where('setting_key', key).update({
                        setting_value: String(value),
                        updated_at: trx.fn.now(),
                    });
                } else {
                    await trx('settings').insert({
                        setting_key: key,
                        setting_value: String(value),
                        description: `Auto generated for ${key}`,
                        category: 'System',
                        created_at: trx.fn.now(),
                        updated_at: trx.fn.now(),
                    });
                }
            }
        });

        return this.getAutoBackupConfig();
    }

    async runAutoBackupCycle() {
        const config = await this.getAutoBackupConfig();
        if (!config.enabled || !config.directory) return { skipped: true };

        try {
            await fs.promises.mkdir(config.directory, { recursive: true });
            await fs.promises.access(config.directory, fs.constants.W_OK);
        } catch (error) {
            console.error('Auto Backup Error: directory is unavailable', error);
            return { skipped: true, reason: 'DIRECTORY_UNAVAILABLE' };
        }

        const now = new Date();
        let shouldBackup = false;

        if (!config.lastBackup) {
            shouldBackup = true;
        } else {
            const lastDate = new Date(config.lastBackup);
            if (Number.isNaN(lastDate.getTime())) {
                shouldBackup = true;
            } else {
                const hoursSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
                if (config.interval === 'daily' && hoursSinceLast >= 24) shouldBackup = true;
                if (config.interval === 'weekly' && hoursSinceLast >= 24 * 7) shouldBackup = true;
            }
        }

        if (!shouldBackup) return { skipped: true };

        try {
            const filename = `farmer-market-backup-${timestampForFile(now)}.db`;
            const destination = path.join(config.directory, filename);
            const result = await this.createBackup(destination);
            await this.setAutoBackupConfig({ ...config, lastBackup: now.toISOString() });
            await this.cleanupOldBackups(config.directory, 7);
            return result;
        } catch (error) {
            console.error('Auto Backup Failed:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanupOldBackups(directory, keepCount = 7) {
        try {
            const files = await fs.promises.readdir(directory);
            const backupFiles = await Promise.all(
                files
                    .filter((file) => file.startsWith('farmer-market-backup-') && file.endsWith('.db'))
                    .map(async (name) => {
                        const filePath = path.join(directory, name);
                        const stat = await fs.promises.stat(filePath);
                        return { name, path: filePath, time: stat.mtime.getTime() };
                    }),
            );

            backupFiles.sort((a, b) => b.time - a.time);
            for (const file of backupFiles.slice(Math.max(0, keepCount))) {
                await fs.promises.unlink(file.path);
            }
        } catch (error) {
            console.error('Backup Cleanup Failed:', error);
        }
    }
}

module.exports = new BackupController();