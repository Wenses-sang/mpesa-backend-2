// db.js
const { Pool } = require('pg'); // PostgreSQL client
require('dotenv').config();

// Create a connection pool to PostgreSQL
const db = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your Render PostgreSQL URL
  ssl: {
    rejectUnauthorized: false, // Required for Render hosted DB
  },
});

// Test the database connection
db.connect((err, client, release) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL database');
  release();
});

module.exports = db;