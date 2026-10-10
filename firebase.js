// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyB_A_7p9bwx1yhC3OG4Kdp6pIDNprjPUdU',
  authDomain: 'plantwebsite-a8bde.firebaseapp.com',
  projectId: 'plantwebsite-a8bde',
  storageBucket: 'plantwebsite-a8bde.firebasestorage.app',
  messagingSenderId: '702483734750',
  appId: '1:702483734750:web:b19982bac657262ac8a24f',
  measurementId: 'G-KLL4W7LWFX',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(() => {})
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app