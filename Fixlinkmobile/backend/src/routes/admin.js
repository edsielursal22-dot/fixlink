const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// GET: Fetch all users (so admin can view customers and technicians)
router.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT: Verify or update technician status (e.g., 'active', 'deactivated')
router.put('/verify-technician/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { status, rejectionReason } = req.body; // e.g., 'active' or 'suspended'

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await userRef.update({
      status,
      ...(status === 'active' ? { verificationStatus: 'verified', rejectionReason: null } : {}),
      ...(status === 'rejected' ? { verificationStatus: 'rejected', rejectionReason: rejectionReason || 'Application was not approved.' } : {})
    });

    res.status(200).json({ 
      message: `Technician status successfully updated to ${status}`,
      uid 
    });
  } catch (error) {
    console.error('Error updating technician status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;