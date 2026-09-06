const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db } = require('../config/firebase');
const portfolioDirectory = path.join(__dirname, '../../uploads/technician-portfolio');
fs.mkdirSync(portfolioDirectory, { recursive: true });
const portfolioUpload = multer({
  storage: multer.diskStorage({ destination: portfolioDirectory, filename: (req, file, callback) => callback(null, `${req.params.id}-${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`) }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png'].includes(file.mimetype))
});

router.get('/platform/categories', async (req, res) => {
  try {
    const snapshot = await db.collection('categories').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/platform/announcements', async (req, res) => {
  try {
    const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').limit(5).get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/profile', async (req, res) => {
  try {
    const profileDoc = await db.collection('users').doc(req.params.id).get();
    if (!profileDoc.exists || profileDoc.data().role !== 'technician') return res.status(404).json({ error: 'Technician profile not found' });
    const profile = profileDoc.data();
    const [jobsSnapshot, reviewsSnapshot] = await Promise.all([
      db.collection('acceptedJobs').where('technicianUid', '==', req.params.id).get(),
      db.collection('reviews').where('technicianUid', '==', req.params.id).get()
    ]);
    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    res.json({
      ...profile,
      uid: req.params.id,
      verified: profile.status === 'active' || profile.verificationStatus === 'verified',
      completedJobs: jobsSnapshot.docs.filter(doc => String(doc.data().status).toLowerCase() === 'completed').length,
      averageRating: reviews.length ? Number((reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)) : 0,
      reviews: reviews.map(review => ({ rating: review.rating || 0, comment: review.comment || review.text || '', createdAt: review.createdAt || null })),
      portfolio: profile.portfolio || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/location', async (req, res) => {
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return res.status(400).json({ error: 'Valid coordinates are required.' });
  await db.collection('users').doc(req.params.id).update({ latitude, longitude });
  res.json({ latitude, longitude });
});

router.post('/:id/portfolio', portfolioUpload.array('photos', 6), async (req, res) => {
  try {
    const profileRef = db.collection('users').doc(req.params.id);
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists || profileDoc.data().role !== 'technician') return res.status(404).json({ error: 'Technician profile not found' });
    const existing = profileDoc.data().portfolio || [];
    const files = (req.files || []).map(file => ({
      name: file.originalname,
      url: `${process.env.FILE_BASE_URL || 'http://192.168.1.36:5000'}/api/users/${req.params.id}/portfolio/${encodeURIComponent(file.filename)}`,
      uploadedAt: new Date().toISOString()
    }));
    const portfolio = [...existing, ...files];
    await profileRef.update({ portfolio });
    res.status(201).json({ portfolio });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/portfolio/:filename', async (req, res) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  const filePath = path.join(portfolioDirectory, filename);
  if (!fs.existsSync(filePath) || !filename.startsWith(`${req.params.id}-`)) return res.status(404).json({ error: 'Portfolio image not found' });
  res.sendFile(filePath);
});

// GET: Fetch user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;