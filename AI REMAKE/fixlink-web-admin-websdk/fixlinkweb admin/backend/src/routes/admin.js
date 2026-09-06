const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// PATCH: Verify/Approve a technician account
router.patch('/verify-technician/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update status to active
    await userRef.update({
      status: 'active',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Technician verified and activated successfully' });
  } catch (error) {
    console.error('Error verifying technician:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;