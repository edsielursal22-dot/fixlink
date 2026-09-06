const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const router = express.Router();
const { db, auth } = require('../config/firebase');

const sessions = new Map();

const collectionNames = {
  requests: 'repairRequests',
  reports: 'reports',
  reviews: 'reviews',
  categories: 'categories',
  announcements: 'announcements'
};

function userPayload(doc) {
  const data = doc.data();
  return {
    uid: doc.id,
    ...data,
    status: data.status || (data.skills && data.skills.status) || (data.disabled ? 'inactive' : 'active'),
    createdAt: data.createdAt || null
  };
}

async function listCollection(name) {
  if (name === 'repairRequests') {
    const [requestsSnapshot, acceptedSnapshot] = await Promise.all([
      db.collection('repairRequests').get(),
      db.collection('acceptedJobs').get()
    ]);
    return [
      ...requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...acceptedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), originalRequestId: doc.data().originalRequestId || null }))
    ];
  }
  const snapshot = await db.collection(name).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function cookieValue(request, name) {
  const cookies = String(request.headers.cookie || '').split(';');
  const cookie = cookies.find(item => item.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
}

function requireAdmin(request, response, next) {
  const sessionId = cookieValue(request, 'fixlink_admin_session');
  if (!sessionId || !sessions.has(sessionId)) return response.status(401).json({ error: 'Admin login required' });
  request.admin = sessions.get(sessionId);
  next();
}

// POST: Start an admin session using credentials stored in backend/.env.
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!safeEqual(username, process.env.ADMIN_USERNAME) || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid admin username or password' });
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { username, createdAt: Date.now() });
  res.setHeader('Set-Cookie', `fixlink_admin_session=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ message: 'Admin login successful' });
});

// POST: End the current admin session.
router.post('/logout', (req, res) => {
  const sessionId = cookieValue(req, 'fixlink_admin_session');
  if (sessionId) sessions.delete(sessionId);
  res.setHeader('Set-Cookie', 'fixlink_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ message: 'Logged out' });
});

// GET: Check whether the browser has an active admin session.
router.get('/session', (req, res) => {
  const sessionId = cookieValue(req, 'fixlink_admin_session');
  res.json({ authenticated: Boolean(sessionId && sessions.has(sessionId)) });
});

router.use(requireAdmin);

// GET: Dashboard metrics and recent activity.
router.get('/overview', async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(userPayload);
    const requests = await listCollection(collectionNames.requests);
    const reviews = await listCollection(collectionNames.reviews);
    const pendingTechnicians = users.filter(user => user.role === 'technician' && user.status === 'pending_verification');
    const technicians = users.filter(user => user.role === 'technician');
    const customers = users.filter(user => user.role === 'customer');
    const completedRequests = requests.filter(request => String(request.status).toLowerCase() === 'completed').length;
    const averageRating = reviews.length
      ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
      : 0;

    res.json({
      counts: {
        customers: customers.length,
        technicians: technicians.length,
        pendingTechnicians: pendingTechnicians.length,
        requests: requests.length,
        completedRequests,
        activeRequests: requests.filter(request => ['pending', 'accepted', 'in progress'].includes(String(request.status || 'pending').toLowerCase())).length,
        reviews: reviews.length,
        averageRating: Number(averageRating.toFixed(1))
      },
      requestStatuses: requests.reduce((result, request) => {
        const status = request.status || 'Pending';
        result[status] = (result[status] || 0) + 1;
        return result;
      }, {}),
      recentUsers: users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5),
      pendingTechnicians: pendingTechnicians.slice(0, 5)
    });
  } catch (error) {
    console.error('Error loading admin overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: All user accounts for the admin directory.
router.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    let users = snapshot.docs.map(userPayload);
    const search = String(req.query.search || '').toLowerCase();
    const role = String(req.query.role || 'all').toLowerCase();
    const status = String(req.query.status || 'all').toLowerCase();

    users = users.filter(user => {
      const matchesSearch = !search || `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(search);
      const matchesRole = role === 'all' || String(user.role).toLowerCase() === role;
      const matchesStatus = status === 'all' || String(user.status).toLowerCase() === status;
      return matchesSearch && matchesRole && matchesStatus;
    });

    res.json(users);
  } catch (error) {
    console.error('Error loading admin users:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Load the complete stored profile for an admin's technician review.
router.get('/technicians/:uid', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'Technician profile not found' });

    const profile = doc.data();
    if (profile.role !== 'technician') return res.status(404).json({ error: 'Technician profile not found' });

    const { password, passwordHash, resetToken, ...safeProfile } = profile;
    res.json({
      uid: doc.id,
      ...safeProfile,
      status: profile.status || (profile.skills && profile.skills.status) || (profile.disabled ? 'inactive' : 'active'),
      createdAt: profile.createdAt || null
    });
  } catch (error) {
    console.error('Error loading technician profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Proxy a technician credential only after the admin session is verified.
router.get('/technicians/:uid/credential/:type', async (req, res) => {
  try {
    const fieldByType = { 'government-id': 'governmentIdFileUrl', certificate: 'certificateFileUrl' };
    const field = fieldByType[req.params.type];
    if (!field) return res.status(400).json({ error: 'Invalid credential type' });

    const doc = await db.collection('users').doc(req.params.uid).get();
    const fileUrl = doc.exists ? doc.data()[field] : null;
    if (!fileUrl) return res.status(404).json({ error: 'Credential file not found' });

    let fetchUrl = fileUrl;
    if (fetchUrl.includes(':5000')) {
      const urlObj = new URL(fetchUrl);
      urlObj.hostname = 'localhost';
      fetchUrl = urlObj.toString();
    }

    const fileResponse = await fetch(fetchUrl, { headers: { 'x-file-access-token': process.env.FILE_ACCESS_TOKEN || 'fixlink-local-credential-access-2026' } });
    if (!fileResponse.ok) return res.status(fileResponse.status).json({ error: 'Credential file could not be loaded' });
    res.setHeader('Content-Type', fileResponse.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.send(Buffer.from(await fileResponse.arrayBuffer()));
  } catch (error) {
    console.error('Error loading technician credential:', error);
    res.status(500).json({ error: 'Credential file could not be loaded' });
  }
});

// PATCH: Approve or reject a technician application.
router.patch('/technicians/:uid/decision', async (req, res) => {
  try {
    const { decision, reason } = req.body;
    const status = decision === 'approve' ? 'active' : decision === 'reject' ? 'rejected' : null;
    if (!status) return res.status(400).json({ error: 'decision must be approve or reject' });

    await db.collection('users').doc(req.params.uid).update({
      status,
      isVerified: status === 'active',
      rejectionReason: reason || null,
      updatedAt: new Date().toISOString()
    });
    res.json({ message: `Technician ${decision}d successfully`, status });
  } catch (error) {
    console.error('Error deciding technician application:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Activate, deactivate, suspend, or ban an account.
router.patch('/users/:uid/status', async (req, res) => {
  try {
    const allowedStatuses = ['active', 'inactive', 'suspended', 'banned'];
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid account status' });

    await db.collection('users').doc(req.params.uid).update({ status, disabled: status !== 'active', updatedAt: new Date().toISOString() });
    try { await auth.updateUser(req.params.uid, { disabled: status !== 'active' }); } catch (authError) { console.warn('Auth status sync skipped:', authError.message); }
    res.json({ message: 'Account status updated', status });
  } catch (error) {
    console.error('Error updating account status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Remove a user profile and Firebase Auth account.
router.delete('/users/:uid', async (req, res) => {
  try {
    await db.collection('users').doc(req.params.uid).delete();
    try { await auth.deleteUser(req.params.uid); } catch (authError) { console.warn('Auth deletion skipped:', authError.message); }
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Generate and email a Firebase password-reset link.
router.post('/users/:uid/password-reset', async (req, res) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD || process.env.SMTP_PASSWORD === 'your-gmail-app-password') {
      return res.status(503).json({ error: 'Password email is not configured. Add SMTP_USER and SMTP_PASSWORD to backend/.env.' });
    }

    const user = await auth.getUser(req.params.uid);
    const link = await auth.generatePasswordResetLink(user.email);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '')
      }
    });

    await transporter.sendMail({
      from: `FixLink Support <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Reset your FixLink password',
      text: `A password reset was requested for your FixLink account. Open this link to choose a new password:\n\n${link}\n\nIf you did not request this, you can ignore this email.`
    });

    res.json({ email: user.email, message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error generating password reset link:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Reporting metrics for request volume, technician performance, and popular categories.
router.get('/analytics', async (req, res) => {
  try {
    const [requests, users, reviews] = await Promise.all([
      listCollection('repairRequests'),
      listCollection('users'),
      listCollection('reviews')
    ]);
    const technicians = users.filter(user => user.role === 'technician');
    const technicianPerformance = technicians.map(technician => {
      const assigned = requests.filter(request => request.technicianUid === technician.uid || request.technicianName === technician.name);
      return { name: technician.name || technician.email, requests: assigned.length, completed: assigned.filter(request => String(request.status).toLowerCase() === 'completed').length };
    }).filter(item => item.requests > 0).sort((left, right) => right.completed - left.completed);
    const categories = requests.reduce((result, request) => { const category = request.applianceType || request.category || 'Other'; result[category] = (result[category] || 0) + 1; return result; }, {});
    res.json({ requestVolume: requests.length, completedRequests: requests.filter(request => String(request.status).toLowerCase() === 'completed').length, technicianPerformance, popularCategories: Object.entries(categories).sort((left, right) => right[1] - left[1]).map(([name, count]) => ({ name, count })), reviewCount: reviews.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Load a platform collection for the corresponding admin section.
router.get('/:section', async (req, res) => {
  try {
    const collection = collectionNames[req.params.section];
    if (!collection) return res.status(404).json({ error: 'Unknown admin section' });
    res.json(await listCollection(collection));
  } catch (error) {
    console.error(`Error loading ${req.params.section}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Add a category or announcement.
router.post('/:section', async (req, res) => {
  try {
    const collection = collectionNames[req.params.section];
    if (!collection || !['categories', 'announcements'].includes(req.params.section)) {
      return res.status(404).json({ error: 'This section does not support creation' });
    }
    const record = { ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const reference = await db.collection(collection).add(record);
    res.status(201).json({ id: reference.id, ...record });
  } catch (error) {
    console.error(`Error creating ${req.params.section} record:`, error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Reassign a repair request to another technician.
router.patch('/requests/:id/reassign', async (req, res) => {
  try {
    const { technicianUid, technicianName } = req.body;
    if (!technicianUid) return res.status(400).json({ error: 'technicianUid is required' });
    const requestRef = db.collection('repairRequests').doc(req.params.id);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return res.status(404).json({ error: 'Repair request not found' });
    await requestRef.update({ technicianUid, technicianName: technicianName || 'Assigned technician', status: 'Accepted', updatedAt: new Date().toISOString() });
    res.json({ message: 'Repair request reassigned' });
  } catch (error) {
    console.error('Error reassigning repair request:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Remove an inappropriate review.
router.delete('/reviews/:id', async (req, res) => {
  try {
    await db.collection('reviews').doc(req.params.id).delete();
    res.json({ message: 'Review removed' });
  } catch (error) {
    console.error('Error removing review:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH/DELETE: Maintain marketplace skill categories.
router.patch('/categories/:id', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    await db.collection('categories').doc(req.params.id).update({ name, updatedAt: new Date().toISOString() });
    res.json({ message: 'Category updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await db.collection('categories').doc(req.params.id).delete();
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH: Resolve a complaint and optionally update the reported account.
router.patch('/reports/:id/resolve', async (req, res) => {
  try {
    const { action = 'reviewed', userUid, userStatus } = req.body;
    await db.collection('reports').doc(req.params.id).update({ status: 'resolved', resolution: action, resolvedAt: new Date().toISOString() });
    if (userUid && ['active', 'suspended', 'banned'].includes(userStatus)) {
      await db.collection('users').doc(userUid).update({ status: userStatus, disabled: userStatus !== 'active', updatedAt: new Date().toISOString() });
    }
    res.json({ message: 'Report resolved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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