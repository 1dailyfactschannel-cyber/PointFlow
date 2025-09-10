
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initializeFirebaseServices() {
  auth = getAuth(app);
  storage = getStorage(app);

  // We only want to enable persistence on the client side.
  if (typeof window !== 'undefined') {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ cacheSizeBytes: CACHE_SIZE_UNLIMITED })
      });
      console.log("Firestore persistence successfully enabled.");
    } catch (err: any) {
      // Fallback for browsers that don't support it or when multiple tabs are open.
      db = getFirestore(app); // regular initialization
      if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence failed: multiple tabs open. Persistence will be enabled in one tab only.");
      } else if (err.code == 'unimplemented') {
        console.log("Firestore persistence failed: browser does not support it.");
      } else {
        console.error("An error occurred while enabling Firestore persistence:", err);
      }
    }
  } else {
    // For server-side, initialize without persistence
    db = getFirestore(app);
  }
}

// Initial call to set up services on app load
initializeFirebaseServices();

// Export the function to re-initialize services, and the instances themselves.
export { app, auth, db, storage, initializeFirebaseServices };
