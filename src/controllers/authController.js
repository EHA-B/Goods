const path = require('path');
const bcrypt = require('bcrypt');
const dbmanager = require(path.join(__dirname, '../database/databaseManager'));

function validationError(message, field) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  error.details = field ? { field } : undefined;
  return error;
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    full_name: row.full_name,
    role: row.role,
    isActive: Boolean(row.isActive),
    last_login: row.last_login ?? null,
  };
}

class AuthController {
  async login(input) {
    const username = String(input?.username ?? '').trim();
    const password = String(input?.password ?? '');

    if (!username) throw validationError('Username is required', 'username');
    if (!password) throw validationError('Password is required', 'password');

    const db = await dbmanager.init();
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, username, password_hash, full_name, role, isActive, last_login
         FROM users
         WHERE username = ?
         LIMIT 1`,
        [username],
        (error, row) => {
          if (error) return reject(error);
          resolve(row);
        },
      );
    });

    if (!user) {
      const error = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!Boolean(user.isActive)) {
      const error = new Error('User account is inactive');
      error.code = 'INACTIVE_USER';
      throw error;
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      const error = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users
         SET last_login = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        [user.id],
        function (error) {
          if (error) return reject(error);
          resolve(this.changes);
        },
      );
    });

    const refreshedUser = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, username, full_name, role, isActive, last_login
         FROM users
         WHERE id = ?`,
        [user.id],
        (error, row) => {
          if (error) return reject(error);
          resolve(row);
        },
      );
    });

    return publicUser(refreshedUser);
  }

  async changePassword(userId, input) {
    if (!userId) throw validationError('Authenticated user is required');

    const currentPassword = String(input?.currentPassword ?? '');
    const newPassword = String(input?.newPassword ?? '');

    if (!currentPassword) {
      throw validationError('Current password is required', 'currentPassword');
    }
    if (newPassword.length < 8) {
      throw validationError('New password must be at least 8 characters', 'newPassword');
    }
    if (currentPassword === newPassword) {
      const error = new Error('New password must be different from the current password');
      error.code = 'PASSWORD_UNCHANGED';
      throw error;
    }

    const db = await dbmanager.init();
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, password_hash, isActive FROM users WHERE id = ?`,
        [userId],
        (error, row) => {
          if (error) return reject(error);
          resolve(row);
        },
      );
    });

    if (!user) {
      const error = new Error('User not found');
      error.code = 'NOT_FOUND';
      throw error;
    }
    if (!Boolean(user.isActive)) {
      const error = new Error('User account is inactive');
      error.code = 'INACTIVE_USER';
      throw error;
    }

    const currentMatches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!currentMatches) {
      const error = new Error('Current password is incorrect');
      error.code = 'INVALID_CURRENT_PASSWORD';
      throw error;
    }

    const newMatchesOld = await bcrypt.compare(newPassword, user.password_hash);
    if (newMatchesOld) {
      const error = new Error('New password must be different from the current password');
      error.code = 'PASSWORD_UNCHANGED';
      throw error;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users
         SET password_hash = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [passwordHash, userId],
        function (error) {
          if (error) return reject(error);
          resolve(this.changes);
        },
      );
    });

    return { success: true, message: 'Password changed successfully' };
  }
}

module.exports = new AuthController();
