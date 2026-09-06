const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

// POST: Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // 1. Sanitize email input and fetch user record from Firebase Auth
    const sanitizedEmail = email.trim().toLowerCase();
    const userRecord = await admin.auth().getUserByEmail(sanitizedEmail);
    
    // 2. Fetch user profile from Firestore to get role and status
    const userDoc = await db.collection('users').doc(userRecord.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found in database' });
    }

    const userData = userDoc.data();

    // 3. Check if technician account is still pending verification
    if (userData.role === 'technician' && userData.status === 'pending_verification') {
      return res.status(403).json({ error: 'Your account is pending admin verification.' });
    }

    // 4. Return user info on successful login validation
    res.status(200).json({
      message: 'Login successful',
      uid: userRecord.uid,
      role: userData.role,
      name: userData.name,
      status: userData.status
    });

  } catch (error) {
    console.error('Login error details:', error.message);
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// POST: Register a new user (Customer or Technician)
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, skills } = req.body;
    
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields (email, password, role, name)' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: sanitizedEmail,
      password,
      displayName: name,
    });

    // 2. Determine initial status based on role (Technicians require admin verification)
    const initialStatus = role === 'technician' ? 'pending_verification' : 'active';

    // 3. Save extended profile details in Firestore using Auth UID as document ID
    const userData = {
      uid: userRecord.uid,
      email: sanitizedEmail,
      role, // 'customer', 'technician', or 'admin'
      name,
      status: initialStatus,
      createdAt: new Date().toISOString()
    };

    if (role === 'technician') {
      userData.skills = skills || []; // Store technician specializations
    }

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({ 
      message: 'User registered successfully', 
      uid: userRecord.uid,
      status: initialStatus 
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;