/**
 * Database Configuration – PostgreSQL connection via pg.
 */

const { Pool } = require('pg');

let pool = null;

/**
 * Get or create the singleton database connection pool.
 */
function getDb() {
  if (pool) return pool;

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

/**
 * Close the database connection gracefully.
 */
async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getDb, closeDb };
