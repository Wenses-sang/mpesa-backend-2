// routes/payments.js
const express = require('express');
const axios = require('axios');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

// ================= GET USER PAYMENTS =================
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payments:', err.message);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// ================= MPESA STK PUSH =================
router.post('/mpesa/pay', async (req, res) => {
  const { userId, phone, amount } = req.body;

  if (!userId || !phone || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1️⃣ GET ACCESS TOKEN
    const tokenResponse = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        auth: {
          username: process.env.MPESA_CONSUMER_KEY,
          password: process.env.MPESA_CONSUMER_SECRET,
        },
      }
    );
    const accessToken = tokenResponse.data.access_token;

    // 2️⃣ GENERATE TIMESTAMP
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // 3️⃣ GENERATE PASSWORD
    const password = Buffer.from(
      process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
    ).toString('base64');

    // 4️⃣ STK PUSH REQUEST
    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: `${process.env.BASE_URL}/payments/mpesa/callback`,
        AccountReference: `Fees-${userId}`,
        TransactionDesc: 'University Fees Payment',
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { MerchantRequestID, CheckoutRequestID } = stkResponse.data;

    // 5️⃣ STORE PAYMENT IN DATABASE
    await db.query(
      `INSERT INTO payments
      (user_id, merchantRequestID, checkoutRequestID, phone, amount, status, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, MerchantRequestID, CheckoutRequestID, phone, amount, 'PENDING', 'MPESA Fees Payment']
    );

    res.json({
      message: 'STK Push sent successfully',
      MerchantRequestID,
      CheckoutRequestID,
    });

  } catch (error) {
    console.error('MPESA request error:', error.response?.data || error.message);
    res.status(500).json({ error: 'MPESA request failed' });
  }
});

// ================= MPESA CALLBACK =================
router.post('/mpesa/callback', async (req, res) => {
  const callbackData = req.body;

  try {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const merchantRequestID = callbackData.Body.stkCallback.MerchantRequestID;

    const status = resultCode === 0 ? 'SUCCESS' : 'FAILED';

    await db.query(
      'UPDATE payments SET status = $1, date = CURRENT_TIMESTAMP WHERE merchantRequestID = $2',
      [status, merchantRequestID]
    );

    console.log('MPESA CALLBACK:', callbackData);

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(500).json({ error: 'Callback processing error' });
  }
});

module.exports = router;