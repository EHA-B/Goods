const path = require('path');
const fs = require('fs');
const { app } = require('electron');

function getKnex() {
    if (!global.__knex) throw new Error("Knex not initialized");
    return global.__knex;
}

class BackupController {

    async createBackup(destinationPath) {
        if (!destinationPath) throw new Error("Destination path is required");
        
        const knex = getKnex();
        // Force SQLite to flush WAL and checkpoint
        await knex.raw('PRAGMA wal_checkpoint(TRUNCATE)');

        const dbPath = path.join(app.getPath('userData'), 'farmer-market.db');
        
        // Copy file
        await fs.promises.copyFile(dbPath, destinationPath);
        return { success: true, destination: destinationPath };
    }

    async restoreBackup(sourcePath) {
        if (!sourcePath) throw new Error("Source path is required");
        if (!fs.existsSync(sourcePath)) throw new Error("Backup file not found at " + sourcePath);

        const dbPath = path.join(app.getPath('userData'), 'farmer-market.db');
        
        // Copy the backup over the current DB
        await fs.promises.copyFile(sourcePath, dbPath);

        // Delete WAL and SHM files to prevent corruption if they exist
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(walPath)) await fs.promises.unlink(walPath);
        if (fs.existsSync(shmPath)) await fs.promises.unlink(shmPath);

        // Signal success. It is up to the caller (main process) to restart the app immediately
        return { success: true };
    }

    async getAutoBackupConfig() {
        const knex = getKnex();
        const settings = await knex('settings').whereIn('setting_key', [
            'auto_backup_enabled',
            'auto_backup_interval',
            'auto_backup_directory',
            'last_auto_backup'
        ]);

        const config = {
            enabled: false,
            interval: 'daily', // 'daily' | 'weekly'
            directory: '',
            lastBackup: null
        };

        for (const row of settings) {
            if (row.setting_key === 'auto_backup_enabled') config.enabled = row.setting_value === 'true';
            if (row.setting_key === 'auto_backup_interval') config.interval = row.setting_value;
            if (row.setting_key === 'auto_backup_directory') config.directory = row.setting_value;
            if (row.setting_key === 'last_auto_backup') config.lastBackup = row.setting_value;
        }

        return config;
    }

    async setAutoBackupConfig(input) {
        const knex = getKnex();
        await knex.transaction(async (trx) => {
            const keys = {
                'auto_backup_enabled': input.enabled !== undefined ? String(input.enabled) : null,
                'auto_backup_interval': input.interval,
                'auto_backup_directory': input.directory,
                'last_auto_backup': input.lastBackup
            };

            for (const [key, value] of Object.entries(keys)) {
                if (value === undefined || value === null) continue;
                
                const existing = await trx('settings').where('setting_key', key).first();
                if (existing) {
                    await trx('settings').where('setting_key', key).update({ setting_value: value, updated_at: trx.fn.now() });
                } else {
                    await trx('settings').insert({
                        setting_key: key,
                        setting_value: value,
                        description: `Auto generated for ${key}`,
                        category: 'System',
                        created_at: trx.fn.now(),
                        updated_at: trx.fn.now()
                    });
                }
            }
        });
        return this.getAutoBackupConfig();
    }

    async runAutoBackupCycle() {
        const config = await this.getAutoBackupConfig();
        if (!config.enabled || !config.directory) return;

        // Ensure directory exists
        if (!fs.existsSync(config.directory)) {
            try {
                fs.mkdirSync(config.directory, { recursive: true });
            } catch (e) {
                console.error("Auto Backup Error: Could not create directory", e);
                return;
            }
        }

        const now = new Date();
        let shouldBackup = false;

        if (!config.lastBackup) {
            shouldBackup = true;
        } else {
            const lastDate = new Date(config.lastBackup);
            const hoursSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

            if (config.interval === 'daily' && hoursSinceLast >= 24) shouldBackup = true;
            if (config.interval === 'weekly' && hoursSinceLast >= (24 * 7)) shouldBackup = true;
        }

        if (shouldBackup) {
            try {
                // Generate filename
                const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
                const filename = `farmer-market-backup-${dateStr}.db`;
                const dest = path.join(config.directory, filename);
                
                await this.createBackup(dest);
                
                // Update last backup time
                await this.setAutoBackupConfig({ lastBackup: now.toISOString() });
                
                // Cleanup old backups (keep last 7)
                await this.cleanupOldBackups(config.directory, 7);
            } catch (error) {
                console.error("Auto Backup Failed:", error);
            }
        }
    }

    async cleanupOldBackups(directory, keepCount) {
        try {
            const files = await fs.promises.readdir(directory);
            const backupFiles = files
                .filter(f => f.startsWith('farmer-market-backup-') && f.endsWith('.db'))
                .map(f => ({ name: f, path: path.join(directory, f), time: fs.statSync(path.join(directory, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time); // newest first

            if (backupFiles.length > keepCount) {
                const toDelete = backupFiles.slice(keepCount);
                for (const file of toDelete) {
                    await fs.promises.unlink(file.path);
                }
            }
        } catch (error) {
            console.error("Backup Cleanup Failed:", error);
        }
    }
}

module.exports = new BackupController();
