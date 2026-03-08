const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route (important for checking server)
app.get('/', (req, res) => {
  res.send('MPESA Backend Running');
});

// Routes
app.use('/auth', authRoutes);
app.use('/payments', paymentRoutes);

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});