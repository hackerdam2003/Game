// js/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// The Single Source of Truth: Racing Engine Database
const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
    storageBucket: "racing-universe-engine.firebasestorage.app",
    messagingSenderId: "572638328716",
    appId: "1:572638328716:web:830bd01db1fa5b45d948a9",
    measurementId: "G-4VYPKBPD4K"
};

// Initialize the Main Game App
const app = initializeApp(engineConfig);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Export universally so auth.js, friends.js, and others can use the exact same instance
export { auth, db, provider };

console.log("🔥 Firebase Engine Initialized (Unified Database Connected)");
