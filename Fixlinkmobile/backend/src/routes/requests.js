const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const { db, bucket, messaging } = require('../config/firebase');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const distanceInKm = (firstLatitude, firstLongitude, secondLatitude, secondLongitude) => {
  if (![firstLatitude, firstLongitude, secondLatitude, secondLongitude].every(Number.isFinite)) return null;
  const radians = (value) => value * Math.PI / 180;
  const latitudeDelta = radians(secondLatitude - firstLatitude);
  const longitudeDelta = radians(secondLongitude - firstLongitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(firstLatitude)) * Math.cos(radians(secondLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const triggerMatching = async (requestId, request) => {
  const techsSnapshot = await db.collection('users')
      .where('role', '==', 'technician')
      .where('status', '==', 'active') 
      .get();

  const candidates = techsSnapshot.docs.filter(doc => {
      const tech = doc.data();
      if (!tech.latitude || !tech.longitude || !tech.fcmToken) return false;
      const distance = distanceInKm(request.latitude, request.longitude, tech.latitude, tech.longitude);
      return distance !== null && distance <= 20; 
  });

  const tokens = candidates.map(c => c.data().fcmToken);
  if(tokens.length > 0) {
      try {
          await messaging.sendEachForMulticast({
              tokens,
              notification: { title: 'New Job Available!', body: `A new ${request.applianceType} request is near you.` }
          });
      } catch (err) {
          console.error("FCM error", err);
      }
  }
};

// 1. POST Route: Submit a new repair request (Customer side)
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { customerName, customerUid, applianceType, description, location, latitude, longitude, preferredDate, preferredTime, isOther } = req.body;

    if (!customerName || !applianceType || !description || !location) {
      return res.status(400).json({ error: 'Please fill out all required fields.' });
    }

    const newRequest = {
      customerName,
      ...(customerUid && { customerUid }),
      applianceType,
      description,
      location,
      ...(latitude && { latitude: Number(latitude) }),
      ...(longitude && { longitude: Number(longitude) }),
      ...(preferredDate && { preferredDate }),
      ...(preferredTime && { preferredTime }),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      isOther: Boolean(isOther)
    };

    if (req.file) {
      try {
        const fileName = `repair-requests/${Date.now()}-${crypto.randomUUID()}-${req.file.originalname}`;
        const file = bucket.file(fileName);
        await file.save(req.file.buffer, {
          metadata: { contentType: req.file.mimetype, metadata: { firebaseStorageDownloadTokens: crypto.randomUUID() } }
        });
        await file.makePublic();
        newRequest.photoUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(fileName)}`;
      } catch (photoError) {
        console.error('Photo upload failed; saving request without photo:', photoError.message);
      }
    }

    const docRef = await db.collection('repairRequests').add(newRequest);

    // Trigger matching
    triggerMatching(docRef.id, newRequest).catch(console.error);

    res.status(201).json({ 
      message: newRequest.photoUrl
        ? 'Repair request submitted successfully!'
        : 'Repair request submitted successfully. The photo could not be uploaded.',
      photoUploaded: Boolean(newRequest.photoUrl),
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
    const { technicianUid, category } = req.query;
    const snapshot = await db.collection('repairRequests').get();
    const requests = [];
    let technician = null;
    if (technicianUid) {
      const technicianDoc = await db.collection('users').doc(technicianUid).get();
      technician = technicianDoc.exists ? technicianDoc.data() : null;
    }

    fs.appendFileSync(path.join(__dirname, '../../debug.log'), `[DEBUG] Number of requests found: ${snapshot.size}, Technician: ${technicianUid}\n`);

    snapshot.forEach(doc => {
      const data = doc.data();
      const verified = technician?.status === 'active' || technician?.verificationStatus === 'verified';
      const skills = Array.isArray(technician?.skills) ? technician.skills : [];
      fs.appendFileSync(path.join(__dirname, '../../debug.log'), `[DEBUG] Processing RequestId: ${doc.id}, Cat: ${data.applianceType}, Skills: ${JSON.stringify(skills)}\n`);
      const normalize = (str) => String(str).toLowerCase().trim().replace(/[\s\/]/g, '');
      const skillsNormalized = skills.map(normalize);
      const requestedCategoryNormalized = normalize(data.applicationType || data.applianceType || category || '');

      // Debugging logs to help diagnose why the tech is not seeing jobs
      if (technicianUid) {
        fs.appendFileSync(path.join(__dirname, '../../debug.log'), `[DEBUG] RequestId: ${doc.id}, NormalizedSkills: ${JSON.stringify(skillsNormalized)}, ReqCatNorm: ${requestedCategoryNormalized}\n`);
      }
      
      const skillMatch = !technicianUid || (verified && skillsNormalized.some(skillNorm => {
        if (data.isOther) {
          return skillNorm === 'others';
        }
        
        // Expanded matching logic
        const requestedCategoryNormalized = normalize(data.applicationType || data.applianceType || category || '');
        const normalizedSkills = skills.map(normalize);

        const isComputerRequest = ['laptop', 'computermonitor', 'desktopcomputer'].includes(requestedCategoryNormalized);
        const hasComputerSkill = normalizedSkills.some(skill => skill.includes('computer') || skill.includes('laptop'));

        const match = skillNorm === requestedCategoryNormalized || 
                 requestedCategoryNormalized.includes(skillNorm) || 
                 skillNorm.includes(requestedCategoryNormalized) || 
                 skillNorm === 'generalrepair' ||
                 (isComputerRequest && hasComputerSkill); // <-- Automatic broad match

        if (match) {
            fs.appendFileSync(path.join(__dirname, '../../debug.log'), `[DEBUG] Match found! RequestId: ${doc.id}, Skill: ${skillNorm}, ReqCat: ${requestedCategoryNormalized}\n`);
        }
                 
        return match;
      }));
      const distanceKm = technician && distanceInKm(Number(technician.latitude), Number(technician.longitude), Number(data.latitude), Number(data.longitude));
      if ((!data.status || data.status === 'Pending') && skillMatch && data.declinedBy !== technicianUid) {
        requests.push({ id: doc.id, ...data, ...(distanceKm !== null && { distanceKm: Number(distanceKm.toFixed(1)) }) });
      }
    });

    requests.sort((first, second) => (first.distanceKm ?? Number.POSITIVE_INFINITY) - (second.distanceKm ?? Number.POSITIVE_INFINITY));

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching repair requests:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/customer/:customerName', async (req, res) => {
  try {
    const [pendingSnapshot, acceptedSnapshot] = await Promise.all([
      db.collection('repairRequests').get(),
      db.collection('acceptedJobs').get()
    ]);
    const requestedName = String(req.params.customerName || '').trim().toLowerCase();
    const requestedUid = String(req.query.customerUid || '').trim();
    const jobs = [
      ...pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...acceptedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ].filter(job => {
      const jobName = String(job.customerName || '').trim().toLowerCase();
      const nameMatches = jobName && requestedName && (
        jobName === requestedName ||
        jobName.includes(requestedName) ||
        requestedName.includes(jobName) ||
        jobName.split(/\s+/)[0] === requestedName.split(/\s+/)[0]
      );
      const uidMatches = requestedUid && job.customerUid === requestedUid;
      return (uidMatches || nameMatches) && String(job.status || '').toLowerCase() !== 'completed';
    });
    const withTechnician = await Promise.all(jobs.map(async (job) => {
      if (!job.technicianUid) return job;
      const technicianDoc = await db.collection('users').doc(job.technicianUid).get();
      const technician = technicianDoc.exists ? technicianDoc.data() : {};
      return { ...job, technicianPhone: technician.phone || null, technicianSkills: technician.skills || [] };
    }));
    res.json(withTechnician);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load request status.' });
  }
});

router.get('/technician/:technicianUid', async (req, res) => {
  try {
    const snapshot = await db.collection('acceptedJobs').where('technicianUid', '==', req.params.technicianUid).get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load technician jobs.' });
  }
});

router.get('/accepted/:id/messages', async (req, res) => {
  try {
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Accepted job not found.' });
    const snapshot = await jobRef.collection('messages').orderBy('timestamp', 'asc').get();
    res.json(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (error) {
    console.error('Error loading job messages:', error);
    res.status(500).json({ error: 'Unable to load job messages.' });
  }
});

router.post('/accepted/:id/messages', async (req, res) => {
  try {
    const { senderUid, senderName, senderRole, text } = req.body || {};
    if (!senderUid || !senderName || !senderRole || !String(text || '').trim()) {
      return res.status(400).json({ error: 'Sender identity and message text are required.' });
    }
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Accepted job not found.' });
    const message = {
      senderUid: String(senderUid),
      senderName: String(senderName),
      senderRole: String(senderRole),
      text: String(text).trim(),
      timestamp: new Date().toISOString()
    };
    const messageRef = await jobRef.collection('messages').add(message);
    res.status(201).json({ id: messageRef.id, ...message });
  } catch (error) {
    console.error('Error saving job message:', error);
    res.status(500).json({ error: 'Unable to save job message.' });
  }
});

router.put('/:id/decline', async (req, res) => {
  try {
    const { technicianUid } = req.body || {};
    const requestRef = db.collection('repairRequests').doc(req.params.id);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) return res.status(404).json({ error: 'Repair request not found.' });
    await requestRef.update({ ...(technicianUid && { declinedBy: technicianUid }), status: 'Pending', updatedAt: new Date().toISOString() });
    res.json({ message: 'Request declined and returned to the available queue.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to decline request.' });
  }
});

router.get('/accepted/:id/location', async (req, res) => {
  try {
    const doc = await db.collection('acceptedJobs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Accepted job not found.' });
    const data = doc.data();
    res.json({ latitude: data.latitude || null, longitude: data.longitude || null, location: data.location || null });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load customer location.' });
  }
});

router.get('/accepted/:id/live-tracking', async (req, res) => {
  try {
    const jobDoc = await db.collection('acceptedJobs').doc(req.params.id).get();
    if (!jobDoc.exists) return res.status(404).json({ error: 'Accepted job not found.' });
    const job = jobDoc.data();
    if (!['Accepted', 'In Progress'].includes(job.status)) {
      return res.status(409).json({ error: 'Live tracking is available after job acceptance.' });
    }

    let technician = {};
    if (job.technicianUid) {
      const technicianDoc = await db.collection('users').doc(job.technicianUid).get();
      technician = technicianDoc.exists ? technicianDoc.data() : {};
    }

    res.json({
      customer: {
        latitude: Number(job.latitude) || null,
        longitude: Number(job.longitude) || null,
        name: job.customerName || 'Customer',
        address: job.location || null,
      },
      technician: {
        latitude: Number(technician.latitude) || null,
        longitude: Number(technician.longitude) || null,
        name: job.technicianName || technician.name || 'Technician',
      },
      status: job.status,
      updatedAt: technician.locationUpdatedAt || null,
    });
  } catch (error) {
    console.error('Error loading live tracking:', error);
    res.status(500).json({ error: 'Unable to load live tracking.' });
  }
});

router.put('/accepted/:id/customer-location', async (req, res) => {
  try {
    const latitude = Number(req.body?.latitude);
    const longitude = Number(req.body?.longitude);
    const { customerUid } = req.body || {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !customerUid) {
      return res.status(400).json({ error: 'Customer identity and valid coordinates are required.' });
    }
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists || jobDoc.data().customerUid !== customerUid) return res.status(404).json({ error: 'Assigned job not found.' });
    const locationUpdatedAt = new Date().toISOString();
    await jobRef.update({ latitude, longitude, locationUpdatedAt });
    res.json({ latitude, longitude, locationUpdatedAt });
  } catch (error) {
    console.error('Error updating customer location:', error);
    res.status(500).json({ error: 'Unable to update customer location.' });
  }
});

router.put('/accepted/:id/status', async (req, res) => {
  try {
    const { status, technicianUid } = req.body || {};
    const allowedStatuses = ['In Progress', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid job status.' });
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists || (technicianUid && jobDoc.data().technicianUid !== technicianUid)) return res.status(404).json({ error: 'Assigned job not found.' });
    await jobRef.update({ status, updatedAt: new Date().toISOString() });
    res.json({ message: `Job marked ${status}.`, status });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update job status.' });
  }
});

router.get('/completed/:customerName', async (req, res) => {
  try {
    const snapshot = await db.collection('acceptedJobs').get();
    const jobs = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(job => job.customerName === req.params.customerName && String(job.status).toLowerCase() === 'completed' && !job.reviewId);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load completed jobs.' });
  }
});

router.post('/:id/review', async (req, res) => {
  try {
    const { customerName, rating, comment } = req.body || {};
    const numericRating = Number(rating);
    if (!customerName || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Customer name and a rating from 1 to 5 are required.' });
    }
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists || jobDoc.data().customerName !== customerName || String(jobDoc.data().status).toLowerCase() !== 'completed') {
      return res.status(404).json({ error: 'Completed job not found.' });
    }
    if (jobDoc.data().reviewId) return res.status(409).json({ error: 'This job has already been reviewed.' });
    const reviewRef = await db.collection('reviews').add({
      technicianUid: jobDoc.data().technicianUid,
      technicianName: jobDoc.data().technicianName,
      customerName,
      rating: numericRating,
      comment: String(comment || '').trim(),
      requestId: jobDoc.data().originalRequestId || req.params.id,
      createdAt: new Date().toISOString()
    });
    await jobRef.update({ reviewId: reviewRef.id, reviewedAt: new Date().toISOString() });
    res.status(201).json({ message: 'Review submitted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to submit review.' });
  }
});

// 3. PUT Route: Accept a job and create a SEPARATE 'acceptedJobs' collection
router.put('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianUid, technicianName } = req.body || {};
    if (!technicianUid || !technicianName) {
      return res.status(400).json({ error: 'Technician identity is required to accept a job.' });
    }
    const requestRef = db.collection('repairRequests').doc(id);
    const doc = await requestRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Repair request not found' });
    }

    const jobData = doc.data();

    // Create a brand new document inside the separate 'acceptedJobs' collection
    const acceptedJobRef = await db.collection('acceptedJobs').add({
      ...jobData,
      originalRequestId: id,
      technicianUid,
      technicianName,
      status: 'Accepted',
      verificationCode: Math.floor(1000 + Math.random() * 9000).toString(), // New: Generate 4-digit code
      acceptedAt: new Date().toISOString()
    });

    // Remove the request from the available repairRequests pool
    await requestRef.delete();

    res.status(200).json({ message: 'Job accepted and moved to acceptedJobs collection!', jobId: acceptedJobRef.id });
  } catch (error) {
    console.error('Error accepting job:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New: Route to verify completion code
router.post('/:id/verify-completion', async (req, res) => {
  try {
    const { code } = req.body;
    const jobRef = db.collection('acceptedJobs').doc(req.params.id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) return res.status(404).json({ error: 'Job not found.' });
    if (jobDoc.data().verificationCode !== code) return res.status(400).json({ error: 'Invalid verification code.' });

    await jobRef.update({ status: 'Completed', completedAt: new Date().toISOString() });
    res.json({ message: 'Job completed successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;