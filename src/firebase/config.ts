import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC0kO-OrEJuvpHZAAIOpQJyX38VmcNs-Bk',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ganesh-chaturthi-8ba92.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ganesh-chaturthi-8ba92',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ganesh-chaturthi-8ba92.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '632756720851',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID || '1:632756720851:web:aa521ed8a4cf064f44f026',
}

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app

