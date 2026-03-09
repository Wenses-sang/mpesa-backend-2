const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' });

    db.query('SELECT id FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length > 0) return res.status(400).json({ error: 'Email already registered' });

      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        'INSERT INTO users (full_name, email, phone, password) VALUES (?, ?, ?, ?)',
        [full_name, email, phone, hashedPassword],
        (err, results) => {
          if (err) return res.status(500).json({ error: 'User registration failed' });
          res.json({ message: 'User registered successfully', userId: results.insertId });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing email or password' });

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    res.json({
      message: 'Login successful',
      userId: user.id,
      full_name: user.full_name,
      email: user.email
    });
  });
});

module.exports = router;