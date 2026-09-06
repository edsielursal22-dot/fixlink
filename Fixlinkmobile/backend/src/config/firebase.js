const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./serviceAccountKey.json');

const firebaseProjectId = serviceAccount.project_id;

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: serviceAccount.storage_bucket || `${firebaseProjectId}.appspot.com`,
  authDomain: `${firebaseProjectId}.firebaseapp.com`
});

const db = getFirestore();
const auth = getAuth(app);
const bucket = getStorage(app).bucket();

// Create an admin-like helper object so your existing routes using admin.auth() work seamlessly
const admin = {
  auth: () => auth,
  firestore: () => db,
  apps: [app]
};

module.exports = { db, admin, firebaseProjectId, bucket };