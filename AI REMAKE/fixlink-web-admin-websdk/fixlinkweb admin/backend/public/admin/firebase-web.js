import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// FixLink Web app configuration from Firebase Project Settings.
// These values identify the client app; authorization is still enforced by the backend and Firebase rules.
const firebaseConfig = {
  apiKey: 'AIzaSyDGiGhxutKARnVqFhH7joFH2GjAG8vgvLc',
  authDomain: 'capstone-a7c8c.firebaseapp.com',
  projectId: 'capstone-a7c8c',
  storageBucket: 'capstone-a7c8c.firebasestorage.app',
  messagingSenderId: '721477861864',
  appId: '1:721477861864:web:647e43a6b09159b169645d',
  measurementId: 'G-57CST75JT35',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
