/**
 * Database Configuration – SQLite connection via better-sqlite3.
 * 
 * The schema is designed to be PostgreSQL-compatible. To migrate,
 * swap this module's export for a pg/knex/sequelize connection and
 * adjust the AUTO_INCREMENT / DATETIME syntax in schema.js.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'gift_assistant.db');

let db = null;

/**
 * Get or create the singleton database connection.
 * Enables WAL mode for better concurrent read performance.
 */
function getDb() {
  if (db) return db;

  // Ensure the data directory exists
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Close the database connection gracefully.
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
