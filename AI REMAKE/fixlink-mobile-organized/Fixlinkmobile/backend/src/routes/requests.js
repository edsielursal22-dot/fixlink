const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// 1. POST Route: Submit a new repair request (Customer side)
router.post('/', async (req, res) => {
  try {
    const { customerName, applianceType, description, location } = req.body;

    if (!customerName || !applianceType || !description || !location) {
      return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const newRequest = {
      customerName,
      applianceType,
      description,
      location,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('repairRequests').add(newRequest);

    res.status(201).json({ 
      message: 'Repair request submitted successfully!', 
      requestId: docRef.id 
    });
  } catch (error) {
    console.error('Error saving repair request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET Route: Fetch all pending/available repair requests (Technician side)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('repairRequests').get();
    const requests = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only return requests that are still Pending
      if (!data.status || data.status === 'Pending') {
        requests.push({ id: doc.id, ...data });
      }
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. PUT Route: Accept a job and create a SEPARATE 'acceptedJobs' collection
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const requestRef = db.collection('repairRequests').doc(id);
    const doc = await requestRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Repair request not found' });
    }

    const jobData = doc.data();

    // Create a brand new document inside the separate 'acceptedJobs' collection
    await db.collection('acceptedJobs').add({
      ...jobData,
      originalRequestId: id,
      status: 'Accepted',
      acceptedAt: new Date().toISOString()
    });

    // Remove the request from the available repairRequests pool
    await requestRef.delete();

    res.status(200).json({ message: 'Job accepted and moved to acceptedJobs collection!' });
  } catch (error) {
    console.error('Error accepting job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;