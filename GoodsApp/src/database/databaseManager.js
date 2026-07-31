const path = require('node:path');
const sqlite3 = require('sqlite3');
const { app } = require('electron');

let database = null;
let openingPromise = null;

function getDatabasePath() {
  return path.join(app.getPath('userData'), 'farmer-market.db');
}

function openDatabase() {
  if (database) return Promise.resolve(database);
  if (openingPromise) return openingPromise;

  openingPromise = new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(getDatabasePath(), (error) => {
      if (error) {
        openingPromise = null;
        reject(error);
        return;
      }

      instance.configure('busyTimeout', 5000);
      instance.run('PRAGMA foreign_keys = ON', (pragmaError) => {
        if (pragmaError) {
          instance.close(() => undefined);
          openingPromise = null;
          reject(pragmaError);
          return;
        }

        database = instance;
        openingPromise = null;
        resolve(instance);
      });
    });
  });

  return openingPromise;
}

async function init() {
  return openDatabase();
}

async function close() {
  if (!database) return;

  const instance = database;
  database = null;
  openingPromise = null;

  await new Promise((resolve, reject) => {
    instance.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

module.exports = {
  init,
  close,
  getDatabasePath,
};
