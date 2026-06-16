/*
 * UniDrop Marketplace - Database Configuration
 * 
 * This module manages the PostgreSQL database connection pool.
 * It reads connection parameters from environment variables and
 * creates a pg Pool instance for query execution.
 * 
 * Best Practice: Uses connection pooling for efficient resource management.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create a new PostgreSQL connection pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'unidrop_marketplace',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Maximum number of clients the pool should contain
  max: 20,
  // Maximum time (ms) a client can remain idle before being closed
  idleTimeoutMillis: 30000,
  // Maximum time (ms) to wait for a connection from the pool
  connectionTimeoutMillis: 2000,
});

// Log successful database connection
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL database');
});

// Log errors that occur on idle clients
pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err.message);
  process.exit(-1);
});

/**
 * Execute a database query with parameters
 * @param {string} text - The SQL query text
 * @param {Array} params - Query parameters to prevent SQL injection
 * @returns {Promise<Object>} Query result object
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query executed in ${duration}ms | rows: ${result.rowCount}`);
    return result;
  } catch (error) {
    console.error(`[DB] Query error: ${error.message}`);
    throw error;
  }
};

/**
 * Get a dedicated client from the pool for transaction handling
 * @returns {Promise<Object>} Database client object
 */
const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  query,
  getClient,
  pool,
};
