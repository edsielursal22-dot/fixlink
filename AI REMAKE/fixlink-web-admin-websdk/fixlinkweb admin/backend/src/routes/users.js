const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// GET: Fetch all pending technicians for the admin panel
router.get('/pending-technicians', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'technician')
      .get();

    const pendingTechs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Check status either at root level or nested inside 'skills'
      const status = data.status || (data.skills && data.skills.status);

      if (status === 'pending_verification') {
        pendingTechs.push({
          uid: doc.id,
          name: data.name || 'N/A',
          email: data.email || 'N/A',
          status: status
        });
      }
    });

    res.status(200).json(pendingTechs);
  } catch (error) {
    console.error('Error fetching pending technicians:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;