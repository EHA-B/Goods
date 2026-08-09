const path = require("node:path");
const sqlite3 = require("sqlite3");
const { app } = require("electron");

let database = null;
let openingPromise = null;

function openDatabase() {
  if (database) {
    return Promise.resolve(database);
  }

  if (openingPromise) {
    return openingPromise;
  }

  openingPromise = new Promise((resolve, reject) => {
    const filename = path.join(
      app.getPath("userData"),
      "farmer-market.db",
    );

    const connection = new sqlite3.Database(filename, (error) => {
      if (error) {
        openingPromise = null;
        reject(error);
        return;
      }

      connection.run("PRAGMA foreign_keys = ON", (pragmaError) => {
        if (pragmaError) {
          connection.close();
          openingPromise = null;
          reject(pragmaError);
          return;
        }

        database = connection;
        openingPromise = null;
        resolve(connection);
      });
    });
  });

  return openingPromise;
}

async function init() {
  return openDatabase();
}

async function close() {
  if (!database) {
    return;
  }

  const current = database;
  database = null;

  await new Promise((resolve, reject) => {
    current.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

module.exports = {
  init,
  close,
};
