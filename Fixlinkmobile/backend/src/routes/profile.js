const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db, admin } = require('../config/firebase');

const router = express.Router();
const profileDirectory = path.join(__dirname, '../../uploads/profiles');
fs.mkdirSync(profileDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: profileDirectory,
    filename: (req, file, callback) => callback(null, `${req.params.id}-${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});

const requireAuthenticatedUser = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication is required.' });
  try {
    req.authUser = await admin.auth().verifyIdToken(token);
    if (req.authUser.uid !== req.params.id) return res.status(403).json({ error: 'You can only update your own profile.' });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

router.put('/:id/profile', requireAuthenticatedUser, upload.single('profileImage'), async (req, res) => {
  try {
    const profileRef = db.collection('users').doc(req.params.id);
    const profileDoc = await profileRef.get();
    const { name, phone, address } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });

    if (!profileDoc.exists) {
      const authUser = await admin.auth().getUser(req.params.id);
      await profileRef.set({ uid: req.params.id, email: authUser.email || '', role: 'customer', status: 'active', createdAt: new Date().toISOString() });
    }

    const updates = { name: name.trim(), phone: String(phone || '').trim(), address: String(address || '').trim(), updatedAt: new Date().toISOString() };
    if (req.file) updates.profileImage = `${process.env.FILE_BASE_URL || 'http://192.168.1.36:5000'}/api/profile/${req.params.id}/image/${encodeURIComponent(req.file.filename)}`;
    await profileRef.update(updates);
    res.json({ uid: req.params.id, ...(await profileRef.get()).data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/technician', requireAuthenticatedUser, async (req, res) => {
  try {
    const profileRef = db.collection('users').doc(req.params.id);
    const profileDoc = await profileRef.get();
    if (!profileDoc.exists || profileDoc.data().role !== 'technician') return res.status(404).json({ error: 'Technician profile not found.' });

    const { name, phone, address, bio, skills, yearsExperience } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    const normalizedSkills = Array.isArray(skills)
      ? skills.map((skill) => String(skill).trim()).filter(Boolean)
      : String(skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);
    const updates = {
      name: name.trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
      bio: String(bio || '').trim(),
      skills: normalizedSkills,
      yearsExperience: Number(yearsExperience) || 0,
      updatedAt: new Date().toISOString()
    };
    await profileRef.update(updates);
    res.json({ uid: req.params.id, ...(await profileRef.get()).data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/image/:filename', (req, res) => {
  const filename = path.basename(decodeURIComponent(req.params.filename));
  const filePath = path.join(profileDirectory, filename);
  if (!fs.existsSync(filePath) || !filename.startsWith(`${req.params.id}-`)) return res.status(404).json({ error: 'Profile image not found' });
  res.sendFile(filePath);
});

module.exports = router;
