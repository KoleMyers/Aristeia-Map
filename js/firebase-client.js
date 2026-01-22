// Firebase client module
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged as firebaseOnAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
};

let app = null;
let db = null;
let auth = null;
let currentUser = null;

export function initFirebase() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Firebase not configured. Party sync disabled.');
    return false;
  }
  
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  }
  return true;
}

export function isFirebaseConfigured() {
  return !!(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

export function isAuthenticated() {
  return currentUser !== null;
}

export function onAuthStateChanged(callback) {
  if (!initFirebase()) return;
  
  firebaseOnAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

export async function signInWithEmail(email, password) {
  if (!initFirebase()) {
    return { error: { message: 'Firebase not configured' } };
  }
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signOut() {
  if (!auth) return { error: null };
  
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Party position operations
function getPartyDocRef() {
  if (!db) return null;
  return doc(db, 'markers', 'party');
}

export async function updatePartyPosition(lat, lng) {
  if (!isAuthenticated()) {
    return { error: { message: 'Not authenticated' } };
  }
  
  const docRef = getPartyDocRef();
  if (!docRef) {
    return { error: { message: 'Firebase not configured' } };
  }
  
  try {
    await setDoc(docRef, {
      lat: lat,
      lng: lng,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
    return { error: null };
  } catch (error) {
    console.error('Error updating party position:', error);
    return { error };
  }
}

// Real-time listener for party position
export function onPartyPositionChange(callback) {
  if (!initFirebase()) return null;
  
  const docRef = getPartyDocRef();
  if (!docRef) return null;
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({ lat: data.lat, lng: data.lng });
    }
  }, (error) => {
    console.error('Firebase sync error:', error.message);
  });
}
