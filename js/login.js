// Login page module
import './login.css';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

// Firebase config from env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
};

let auth = null;

// Initialize Firebase if configured
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Redirect if already logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = './';
    }
  });
}

// Handle form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btnText = document.getElementById('login-btn-text');
  const spinner = document.getElementById('login-spinner');
  const btn = document.getElementById('login-btn');
  
  errorEl.classList.remove('visible');
  errorEl.textContent = '';
  
  btnText.style.display = 'none';
  spinner.style.display = 'inline-block';
  btn.disabled = true;
  
  try {
    if (!auth) {
      throw new Error('Authentication not configured');
    }
    
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = './';
    
  } catch (err) {
    let message = 'Login failed. Please try again.';
    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      message = 'Invalid email or password.';
    } else if (err.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Try again later.';
    }
    
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    
    btnText.style.display = 'inline';
    spinner.style.display = 'none';
    btn.disabled = false;
  }
});
