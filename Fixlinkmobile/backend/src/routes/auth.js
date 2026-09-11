const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db, admin, firebaseProjectId } = require('../config/firebase');
const { sendPasswordResetEmail } = require('../utils/emailService');
const credentialDirectory = path.join(__dirname, '../../uploads/technician-documents');
fs.mkdirSync(credentialDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: credentialDirectory,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(extension));
  }
});

// POST: Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    if (!process.env.FIREBASE_WEB_API_KEY) {
      return res.status(500).json({ error: 'Firebase password authentication is not configured' });
    }

    // Firebase Admin can find users but cannot validate their passwords.
    const sanitizedEmail = email.trim().toLowerCase();
    const passwordResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!passwordResponse.ok) {
      const errorData = await passwordResponse.json().catch(() => null);
      const firebaseError = errorData?.error?.message || '';
      console.error('Firebase Login Error:', JSON.stringify(errorData));

      if (firebaseError === 'EMAIL_NOT_FOUND') {
        return res.status(401).json({ error: 'This email is not registered.' });
      }
      if (firebaseError === 'INVALID_PASSWORD' || firebaseError === 'INVALID_LOGIN_CREDENTIALS') {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
      return res.status(401).json({ error: 'Unable to sign in. Please try again.' });
    }

    const passwordData = await passwordResponse.json();
    const userRecord = await admin.auth().getUser(passwordData.localId);
    
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

    if (userData.role === 'technician' && userData.status === 'rejected') {
      return res.status(403).json({ error: `Your technician application was rejected${userData.rejectionReason ? `: ${userData.rejectionReason}` : '.'}` });
    }

    // 4. Return user info on successful login validation
    res.status(200).json({
      message: 'Login successful',
      uid: userRecord.uid,
      role: userData.role,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      address: userData.address || '',
      profileImage: userData.profileImage || null,
      status: userData.status,
      idToken: passwordData.idToken,
      refreshToken: passwordData.refreshToken,
      expiresIn: passwordData.expiresIn
    });

  } catch (error) {
    console.error('Login error details:', error.message);
    res.status(500).json({ error: 'Server error during login. Please try again later.' });
  }
});

// POST: Register a new user (Customer or Technician)
router.post('/register', upload.fields([
  { name: 'governmentIdFile', maxCount: 1 },
  { name: 'certificateFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { email, password, role, name, skills, phone, address, bio, yearsExperience, governmentIdNumber } = req.body || {};
    
    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Missing required fields (email, password, role, name)' });
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const verificationFiles = req.files || {};
    if (role === 'technician' && (!verificationFiles.governmentIdFile?.[0] || !verificationFiles.certificateFile?.[0])) {
      return res.status(400).json({ error: 'Both a government ID file and a certificate file are required.' });
    }

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

    if (phone) userData.phone = phone.trim();
    if (address) userData.address = address.trim();
    if (bio) userData.bio = bio.trim();

    if (role === 'technician') {
      userData.skills = skills ? skills.split(',').map((skill) => skill.trim()).filter(Boolean) : [];
      userData.yearsExperience = Number(yearsExperience) || 0;
      userData.governmentIdNumber = governmentIdNumber?.trim();
      userData.verificationStatus = 'pending';
      const publicFileBaseUrl = process.env.FILE_BASE_URL || 'http://192.168.1.36:5000';
      const saveLocalFileUrl = (document) => document ? `${publicFileBaseUrl}/uploads/technician-documents/${encodeURIComponent(document.filename)}` : null;
      userData.governmentIdFileUrl = saveLocalFileUrl(verificationFiles.governmentIdFile?.[0]);
      userData.certificateFileUrl = saveLocalFileUrl(verificationFiles.certificateFile?.[0]);
    }

    await db.collection('users').doc(userRecord.uid).set(userData);

    res.status(201).json({ 
      message: 'User registered successfully', 
      uid: userRecord.uid,
      status: initialStatus,
      credentialsUploaded: Boolean(userData.governmentIdFileUrl && userData.certificateFileUrl)
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST: Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  try {
    // Generate the password reset link using Firebase Admin SDK
    const link = await admin.auth().generatePasswordResetLink(email);
    
    // Send the link via email service (fired off, not awaited to improve responsiveness)
    sendPasswordResetEmail(email, link).catch(err => console.error('Failed to send reset email:', err));
    
    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Error generating/sending reset link:', error);
    // Provide more specific error if possible to aid debugging
    res.status(500).json({ error: 'Unable to send reset link.', details: error.message });
  }
});

module.exports = router;