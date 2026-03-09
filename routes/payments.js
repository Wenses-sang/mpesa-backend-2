const express = require('express');
const axios = require('axios');
const db = require('../db');
const router = express.Router();
require('dotenv').config();

// GET USER PAYMENTS
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  db.query('SELECT * FROM payments WHERE user_id = ? ORDER BY id DESC', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// MPESA STK PUSH
router.post('/mpesa/pay', async (req, res) => {
  const { userId, phone, amount } = req.body;
  if (!userId || !phone || !amount) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const tokenResponse = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { auth: { username: process.env.MPESA_CONSUMER_KEY, password: process.env.MPESA_CONSUMER_SECRET } }
    );
    const accessToken = tokenResponse.data.access_token;

    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const passwordBase64 = Buffer.from(process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp).toString('base64');

    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: passwordBase64,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: `${process.env.BASE_URL}/payments/mpesa/callback`,
        AccountReference: `Fees-${userId}`,
        TransactionDesc: 'University Fees Payment'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { MerchantRequestID, CheckoutRequestID } = stkResponse.data;

    db.query(
      'INSERT INTO payments (user_id, merchantRequestID, checkoutRequestID, phone, amount, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, MerchantRequestID, CheckoutRequestID, phone, amount, 'PENDING', 'MPESA Fees Payment'],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'STK Push sent successfully', MerchantRequestID, CheckoutRequestID });
      }
    );
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: 'MPESA request failed' });
  }
});

// MPESA CALLBACK
router.post('/mpesa/callback', (req, res) => {
  const callbackData = req.body;
  try {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const merchantRequestID = callbackData.Body.stkCallback.MerchantRequestID;
    const status = resultCode === 0 ? 'SUCCESS' : 'FAILED';

    db.query('UPDATE payments SET status = ?, date = CURRENT_TIMESTAMP WHERE merchantRequestID = ?', [status, merchantRequestID], (err) => {
      if (err) console.error('DB update error:', err.message);
    });

    console.log('MPESA CALLBACK:', callbackData);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing error' });
  }
});

module.exports = router;