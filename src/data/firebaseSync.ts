import { initializeApp } from 'firebase/app'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import type { ShoppingItem } from '../domain/types'
import type { ListSync } from './sync'

export function createFirebaseSync(): ListSync {
  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  })
  const db = getFirestore(app)

  return {
    async createHousehold(pin) {
      await setDoc(doc(db, 'households', pin), { pin, createdAt: Date.now() })
    },
    async joinHousehold(pin) {
      const snap = await getDoc(doc(db, 'households', pin))
      return snap.exists()
    },
    subscribeItems(pin, onChange) {
      return onSnapshot(collection(db, 'households', pin, 'items'), (snap) => {
        const items = snap.docs.map((d) => d.data() as ShoppingItem)
        onChange(items)
      })
    },
    async upsertItem(pin, item) {
      await setDoc(doc(db, 'households', pin, 'items', item.id), item)
    },
    async deleteItem(pin, id) {
      await deleteDoc(doc(db, 'households', pin, 'items', id))
    },
  }
}
