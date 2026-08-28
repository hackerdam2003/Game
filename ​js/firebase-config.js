// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Aapki Asli HFC Bank Keys (Synced with Store)
const firebaseConfig = {
    apiKey: "AIzaSyDuFOfwTplev2IfpCKfiH1ZxCSKuZaftUk",
    authDomain: "hfc-bank-e2a34.firebaseapp.com",
    projectId: "hfc-bank-e2a34",
    storageBucket: "hfc-bank-e2a34.firebasestorage.app",
    messagingSenderId: "1029449998918",
    appId: "1:1029449998918:web:73babbd06999dbe2f16047"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { auth, db, provider };
