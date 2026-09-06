const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebase');

// POST /api/auth/register
// Creates a Firebase Auth user and a matching Firestore profile document.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'email, password, name, and role are required.' });
    }

    const userRecord = await auth.createUser({ email, password, displayName: name });
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role, // e.g. 'customer' or 'technician'
      // Technicians start unverified until an admin approves them
      isVerified: role === 'technician' ? false : true,
      status: role === 'technician' ? 'pending_verification' : 'active',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ uid: userRecord.uid, message: 'User registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
// NOTE: Firebase Admin SDK cannot verify passwords server-side.
// Actual sign-in should happen on the client with the Firebase Client SDK,
// which returns an ID token. This endpoint verifies that token.
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required.' });

    const decoded = await auth.verifyIdToken(idToken);
    res.json({ uid: decoded.uid, email: decoded.email });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

module.exports = router;
