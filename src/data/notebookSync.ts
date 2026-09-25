import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { NotebookList } from '../domain/notebookTypes'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCgCCYXD8Uahfl614xaVvzKjzBkt9A4CyY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'listia-ea166.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'listia-ea166',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'listia-ea166.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '546770727191',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:546770727191:web:dc4e3eba840e3dcef38752',
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

export function getDeviceId(): string {
  let id = localStorage.getItem('listia-device-id')
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 10)
    localStorage.setItem('listia-device-id', id)
  }
  return id
}

export function subscribeHouseholdNotebook(
  pin: string,
  onUpdate: (lists: NotebookList[], updatedBy: string) => void
): Unsubscribe {
  const docRef = doc(db, 'households', pin)
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        if (Array.isArray(data.lists)) {
          onUpdate(data.lists as NotebookList[], data.updatedBy || '')
        }
      }
    },
    (error) => {
      console.warn('Error en suscripción Firestore:', error)
    }
  )
}

export async function pushHouseholdNotebook(
  pin: string,
  lists: NotebookList[]
): Promise<void> {
  if (!pin || !/^\d{6}$/.test(pin)) return
  const myDeviceId = getDeviceId()
  const docRef = doc(db, 'households', pin)
  await setDoc(
    docRef,
    {
      pin,
      lists,
      updatedAt: Date.now(),
      updatedBy: myDeviceId,
    },
    { merge: true }
  )
}

export async function fetchHouseholdNotebook(
  pin: string
): Promise<NotebookList[] | null> {
  if (!pin || !/^\d{6}$/.test(pin)) return null
  const docRef = doc(db, 'households', pin)
  const snap = await getDoc(docRef)
  if (snap.exists() && Array.isArray(snap.data().lists)) {
    return snap.data().lists as NotebookList[]
  }
  return null
}
