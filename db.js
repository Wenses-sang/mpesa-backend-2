<<<<<<< HEAD
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

=======
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
db.getConnection((err, connection) => {

  if (err) {
    console.error("Database connection failed:", err.message);
    return;
  }

  console.log("Connected to MySQL database");

  connection.release();

});

>>>>>>> 6c1499967473491f8571659e2d8b08c639ce7a48
module.exports = db;