/**
 * FixLink Capstone - Mock Data Seeder
 * Cebu Roosevelt Memorial Colleges - College of Computer Studies
 * 
 * Usage:
 *   node scripts/seed.js
 *   node scripts/seed.js --clean (cleans old mock requests and re-seeds)
 */

const { db, admin } = require('../src/config/firebase');

const DEFAULT_PASSWORD = 'Password123!';

// Coordinates centered around Bogo City, Cebu (near Cebu Roosevelt Memorial Colleges)
const BOGO_CITY = {
  center: { lat: 11.0500, lon: 124.0050 },
  sanVicente: { lat: 11.0512, lon: 124.0065, address: 'San Vicente St., Bogo City, Cebu' },
  pRodriguez: { lat: 11.0485, lon: 124.0038, address: 'P. Rodriguez St., Bogo City, Cebu' },
  taytayan: { lat: 11.0430, lon: 124.0080, address: 'Barangay Taytayan, Bogo City, Cebu' },
  gairan: { lat: 11.0590, lon: 124.0120, address: 'Barangay Gairan, Bogo City, Cebu' },
};

const MOCK_USERS = [
  {
    email: 'customer@fixlink.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Maria Santos',
    phone: '+639171234567',
    role: 'customer',
    status: 'active',
  },
  {
    email: 'tech.appliance@fixlink.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Jonard Masong',
    phone: '+639189876543',
    role: 'technician',
    status: 'active',
    verificationStatus: 'verified',
    skills: ['Refrigerator', 'Washing Machine', 'General Repair'],
    latitude: 11.0505,
    longitude: 124.0045,
    locationUpdatedAt: new Date().toISOString(),
    rating: 4.9,
    totalReviews: 24,
    isAvailable: true,
    portfolio: [
      {
        title: 'Samsung Inverter Refrigerator PCB Repair',
        description: 'Diagnosed damaged inverter controller board, replaced capacitors, restored cooling cycle.',
        imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500',
        completedAt: '2026-08-15T10:30:00.000Z'
      },
      {
        title: 'Panasonic Top-Load Washer Motor Replacement',
        description: 'Replaced worn drive belt and repaired faulty spin motor.',
        imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500',
        completedAt: '2026-08-28T14:15:00.000Z'
      }
    ]
  },
  {
    email: 'tech.computer@fixlink.com',
    password: DEFAULT_PASSWORD,
    displayName: 'James Rojas',
    phone: '+639198765432',
    role: 'technician',
    status: 'active',
    verificationStatus: 'verified',
    skills: ['Desktop Computer', 'Laptop', 'Computer Monitor', 'Electronics', 'General Repair'],
    latitude: 11.0475,
    longitude: 124.0020,
    locationUpdatedAt: new Date().toISOString(),
    rating: 5.0,
    totalReviews: 19,
    isAvailable: true,
    portfolio: [
      {
        title: 'Asus ROG Gaming Laptop Overheating Fix',
        description: 'Deep cleaned thermal heatsink and applied high-performance liquid metal thermal paste.',
        imageUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500',
        completedAt: '2026-08-20T16:45:00.000Z'
      }
    ]
  },
  {
    email: 'tech.pending@fixlink.com',
    password: DEFAULT_PASSWORD,
    displayName: 'Carlo Mendoza (Pending Tech)',
    phone: '+639201122334',
    role: 'technician',
    status: 'pending_verification',
    verificationStatus: 'pending',
    skills: ['Electronics', 'General Repair'],
    latitude: 11.0520,
    longitude: 124.0060,
    rating: 0,
    totalReviews: 0,
    isAvailable: false
  }
];

async function getOrCreateAuthUser(userDef) {
  try {
    const existing = await admin.auth().getUserByEmail(userDef.email);
    await admin.auth().updateUser(existing.uid, {
      password: userDef.password,
      displayName: userDef.displayName
    });
    return existing.uid;
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({
        email: userDef.email,
        password: userDef.password,
        displayName: userDef.displayName
      });
      return created.uid;
    }
    throw err;
  }
}

async function seedUsers() {
  console.log('\n--- 1. SEEDING USERS & AUTH ---');
  const seeded = {};

  for (const user of MOCK_USERS) {
    const uid = await getOrCreateAuthUser(user);
    const userDoc = {
      id: uid,
      name: user.displayName,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status || 'active',
      ...(user.verificationStatus && { verificationStatus: user.verificationStatus }),
      ...(user.skills && { skills: user.skills }),
      ...(user.latitude && { latitude: user.latitude }),
      ...(user.longitude && { longitude: user.longitude }),
      ...(user.locationUpdatedAt && { locationUpdatedAt: user.locationUpdatedAt }),
      ...(user.rating !== undefined && { rating: user.rating }),
      ...(user.totalReviews !== undefined && { totalReviews: user.totalReviews }),
      ...(user.isAvailable !== undefined && { isAvailable: user.isAvailable }),
      ...(user.portfolio && { portfolio: user.portfolio }),
      createdAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(userDoc, { merge: true });
    seeded[user.email] = { uid, ...userDoc };
    console.log(`[USER READY] ${user.role.padEnd(10)} | ${user.displayName.padEnd(25)} | Email: ${user.email}`);
  }

  return seeded;
}

async function seedAnnouncements() {
  console.log('\n--- 2. SEEDING ANNOUNCEMENTS ---');
  const announcements = [
    {
      id: 'announcement-crmc-welcome',
      title: 'Welcome to FixLink Bogo City',
      message: 'On-demand home appliance and computer repair technicians are now operating across Bogo City. Submit your request for instant dispatch!',
      active: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'announcement-safety-advisory',
      title: 'Safety & Verification Reminder',
      message: 'Always check that your technician has the verified badge and never give your 4-digit completion code until the repair is finished.',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  for (const item of announcements) {
    await db.collection('announcements').doc(item.id).set(item, { merge: true });
    console.log(`[ANNOUNCEMENT] ${item.title}`);
  }
}

async function seedPendingRequests(customerUid, customerName) {
  console.log('\n--- 3. SEEDING PENDING REPAIR REQUESTS ---');
  const sampleRequests = [
    {
      id: 'demo-req-refrigerator',
      customerUid,
      customerName,
      applianceType: 'Refrigerator',
      description: 'Samsung Two-Door Inverter refrigerator is not cooling. Freezer is slightly cold but lower compartment is completely warm.',
      location: BOGO_CITY.sanVicente.address,
      latitude: BOGO_CITY.sanVicente.lat,
      longitude: BOGO_CITY.sanVicente.lon,
      preferredDate: '2026-09-08',
      preferredTime: 'Morning (8AM-12PM)',
      photoUrl: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500',
      status: 'Pending',
      isOther: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-req-laptop',
      customerUid,
      customerName,
      applianceType: 'Laptop',
      description: 'Acer Swift 3 screen goes black randomly while working. Fan makes loud grinding sound.',
      location: BOGO_CITY.pRodriguez.address,
      latitude: BOGO_CITY.pRodriguez.lat,
      longitude: BOGO_CITY.pRodriguez.lon,
      preferredDate: '2026-09-08',
      preferredTime: 'Afternoon (1PM-5PM)',
      photoUrl: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500',
      status: 'Pending',
      isOther: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-req-washing-machine',
      customerUid,
      customerName,
      applianceType: 'Washing Machine',
      description: 'Whirlpool automatic washing machine drum vibrates violently and does not spin during drain cycle.',
      location: BOGO_CITY.taytayan.address,
      latitude: BOGO_CITY.taytayan.lat,
      longitude: BOGO_CITY.taytayan.lon,
      preferredDate: '2026-09-09',
      preferredTime: 'Morning (8AM-12PM)',
      photoUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500',
      status: 'Pending',
      isOther: false,
      createdAt: new Date().toISOString()
    }
  ];

  for (const req of sampleRequests) {
    await db.collection('repairRequests').doc(req.id).set(req, { merge: true });
    console.log(`[REQUEST ADDED] ${req.applianceType.padEnd(16)} | Loc: ${req.location}`);
  }
}

async function cleanDemoData() {
  if (process.argv.includes('--clean')) {
    console.log('\n[CLEANUP] Purging test requests from repairRequests and acceptedJobs...');
    const collections = ['repairRequests', 'acceptedJobs'];
    for (const coll of collections) {
      const snapshot = await db.collection(coll).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        if (doc.id.startsWith('demo-') || doc.data().customerName === 'Maria Santos') {
          batch.delete(doc.ref);
        }
      });
      await batch.commit();
    }
    console.log('[CLEANUP] Test records cleaned successfully.');
  }
}

async function main() {
  console.log('================================================================');
  console.log('  FIXLINK CAPSTONE: MOCK DATA SEEDER (BOGO CITY, CEBU)');
  console.log('  Cebu Roosevelt Memorial Colleges — College of Computer Studies');
  console.log('================================================================');

  await cleanDemoData();
  const users = await seedUsers();
  await seedAnnouncements();

  const customer = users['customer@fixlink.com'];
  if (customer) {
    await seedPendingRequests(customer.uid, customer.name);
  }

  console.log('\n================================================================');
  console.log('             🎉 MOCK DATA SEEDING COMPLETE! 🎉                  ');
  console.log('================================================================');
  console.log('\nReady for 2-Device Capstone Live Demo:');
  console.log('----------------------------------------------------------------');
  console.log('📱 DEVICE 1 (CUSTOMER DEMO):');
  console.log('   Email:    customer@fixlink.com');
  console.log('   Password: Password123!');
  console.log('   Role:     Customer (Maria Santos)');
  console.log('----------------------------------------------------------------');
  console.log('📱 DEVICE 2 (TECHNICIAN DEMO - APPLIANCES):');
  console.log('   Email:    tech.appliance@fixlink.com');
  console.log('   Password: Password123!');
  console.log('   Role:     Technician (Jonard Masong - Verified)');
  console.log('   Skills:   Refrigerator, Washing Machine, General Repair');
  console.log('----------------------------------------------------------------');
  console.log('💻 BACKUP / COMPUTER TECHNICIAN:');
  console.log('   Email:    tech.computer@fixlink.com');
  console.log('   Password: Password123!');
  console.log('   Role:     Technician (James Rojas - Verified)');
  console.log('   Skills:   Desktop Computer, Laptop, Monitor');
  console.log('================================================================\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seeding failed with error:', err);
    process.exit(1);
  });
